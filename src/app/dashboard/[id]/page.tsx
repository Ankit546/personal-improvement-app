'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'

type Step = {
  id: string
  title: string
  status: 'todo' | 'in_progress' | 'done' | 'blocked'
  points: number
  deadline: string | null
  recurrence_type: 'daily' | 'weekly' | 'monthly' | null
}

type StepCompletion = {                                                                                            
    id: string                                                                                                     
    step_id: string
    completed_date: string
  }

type Goal = {
  id: string
  title: string
  description: string
  current_value: string
  target_value: string
  progress_percent: number
}

const COLUMNS: { label: string; status: Step['status']; color: string }[] = [
  { label: 'Todo', status: 'todo', color: 'bg-gray-100' },
  { label: 'In Progress', status: 'in_progress', color: 'bg-blue-50' },
  { label: 'Blocked', status: 'blocked', color: 'bg-red-50' },
  { label: 'Done', status: 'done', color: 'bg-green-50' },
]

export default function GoalPage() {
  const { id } = useParams()
  const [goal, setGoal] = useState<Goal | null>(null)
  const [steps, setSteps] = useState<Step[]>([])
  const [completions, setCompletions] = useState<StepCompletion[]>([])
  const [newStepIsRecurring, setNewStepIsRecurring] = useState(false)
  const [newStepRecurrenceType, setNewStepRecurrenceType] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [newStepTitle, setNewStepTitle] = useState('')
  const [newStepDeadline, setNewStepDeadline] = useState('')
  const [showAI, setShowAI] = useState(false)
  const [userContext, setUserContext] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      const { data: goalData } = await supabase.from('goals').select('*').eq('id', id).single()
      const { data: stepsData } = await supabase.from('steps').select('*').eq('goal_id', id)
      const { data: completionsData } = await supabase.from('step_completions').select('*')
      setGoal(goalData)
      setSteps(stepsData ?? [])
      setCompletions(completionsData ?? [])
    }
    fetchData()
  }, [id])


  async function handleAddStep(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from('steps').insert({
      goal_id: id,
      title: newStepTitle,
      deadline: newStepDeadline || null,
      recurrence_type: newStepIsRecurring ? newStepRecurrenceType : null,
    })
    setNewStepTitle('')
    setNewStepDeadline('')
    setNewStepIsRecurring(false)
    setNewStepRecurrenceType('daily')
    const { data } = await supabase.from('steps').select('*').eq('goal_id', id)
    setSteps(data ?? [])
  }

  
  async function deleteStep(stepId: string) {
    await supabase.from('user_points').delete().eq('step_id', stepId)
    await supabase.from('steps').delete().eq('id', stepId)
    const remaining = steps.filter(s => s.id !== stepId)
    const doneCount = remaining.filter(s => s.status === 'done').length
    const percent = remaining.length ? Math.round((doneCount / remaining.length) * 100) : 0
    await supabase.from('goals').update({ progress_percent: percent }).eq('id', id)
    setSteps(remaining)
  }

  async function updateStatus(stepId: string, status: Step['status']) {
    const previousStatus = steps.find(s => s.id === stepId)?.status

    await supabase.from('steps').update({ status }).eq('id', stepId)

    const updatedSteps = steps.map(s => s.id === stepId ? { ...s, status } : s)
    const doneCount = updatedSteps.filter(s => s.status === 'done').length
    const percent = Math.round((doneCount / updatedSteps.length) * 100)
    await supabase.from('goals').update({ progress_percent: percent }).eq('id', id)

    if (status === 'done' && previousStatus !== 'done') {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('user_points').insert({
        user_id: user!.id,
        goal_id: id,
        step_id: stepId,
        points: 10,
      })
    } else if (status !== 'done' && previousStatus === 'done') {
      await supabase.from('user_points').delete().eq('step_id', stepId)
    }

    setSteps(updatedSteps)
  }

  async function handleGenerateSteps(e: React.FormEvent) {
    e.preventDefault()
    setAiLoading(true)
    const res = await fetch('/api/generate-steps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goalTitle: goal?.title,
        goalDescription: goal?.description,
        userContext,
      }),
    })
    const { steps: generated } = await res.json()
    for (const title of generated) {
      await supabase.from('steps').insert({ goal_id: id, title })
    }
    const { data } = await supabase.from('steps').select('*').eq('goal_id', id)
    setSteps(data ?? [])
    setShowAI(false)
    setUserContext('')
    setAiLoading(false)
  }

  function getStreak(stepId: string, recurrenceType: 'daily' | 'weekly' | 'monthly'): number {
    const completionDates = completions
      .filter(c => c.step_id === stepId)
      .map(c => c.completed_date)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let streak = 0

    if (recurrenceType === 'daily') {
      for (let i = 0; ; i++) {
        const expected = new Date(today)
        expected.setDate(today.getDate() - i)
        if (completionDates.includes(expected.toISOString().split('T')[0])) {
          streak++
        } else break
      }
    } else if (recurrenceType === 'weekly') {
      for (let i = 0; ; i++) {
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - i * 7 - today.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        const has = completionDates.some(d => {
          const date = new Date(d)
          return date >= weekStart && date <= weekEnd
        })
        if (has) streak++
        else break
      }
    } else if (recurrenceType === 'monthly') {
      for (let i = 0; ; i++) {
        const month = new Date(today.getFullYear(), today.getMonth() - i, 1)
        const has = completionDates.some(d => {
          const date = new Date(d)
          return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth()
        })
        if (has) streak++
        else break
      }
    }

    return streak
  }

  async function handleToggleCompletion(stepId: string) {
    const today = new Date().toISOString().split('T')[0]
    const existing = completions.find(c => c.step_id === stepId && c.completed_date === today)
    const { data: { user } } = await supabase.auth.getUser()

    if (existing) {
      await supabase.from('step_completions').delete().eq('id', existing.id)
      setCompletions(completions.filter(c => c.id !== existing.id))
    } else {
      const { data } = await supabase.from('step_completions').insert({
        step_id: stepId,
        user_id: user!.id,
        completed_date: today,
      }).select().single()
      if (data) setCompletions([...completions, data])
    }
  }


  if (!goal) return <div className="p-8 text-gray-400">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <a href="/dashboard" className="text-sm text-gray-400 hover:text-black mb-6 inline-block">← Back to Dashboard</a>
        <h1 className="text-3xl font-bold">{goal.title}</h1>
        <p className="text-gray-500 mt-1">{goal.description}</p>
        <div className="flex gap-6 mt-2 text-sm text-gray-400">
          <span>Now: {goal.current_value}</span>
          <span>Target: {goal.target_value}</span>
          <span className="font-medium text-gray-600">{goal.progress_percent}% complete</span>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Steps</h2>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAI(!showAI)}
                className="text-sm text-blue-600 hover:underline">
                ✦ Generate with AI
              </button>
            </div>
          </div>

          {showAI && (
            <form onSubmit={handleGenerateSteps} className="flex gap-3 mb-6">
              <input
                className="flex-1 border rounded-lg p-3 text-sm"
                placeholder="Describe your current situation for better steps..."
                value={userContext}
                onChange={e => setUserContext(e.target.value)}
                required
              />
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                {aiLoading ? 'Generating...' : 'Generate'}
              </button>
            </form>
          )}

          <form onSubmit={handleAddStep} className="flex gap-3 mb-6">
            <input
              className="flex-1 border rounded-lg p-3 text-sm"
              placeholder="Add a new step..."
              value={newStepTitle}
              onChange={e => setNewStepTitle(e.target.value)}
              required
            />
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Step Deadline</label>
              <input
                className="border rounded-lg p-3 text-sm"
                type="date"
                value={newStepDeadline}
                onChange={e => setNewStepDeadline(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1 self-end pb-3">
              <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newStepIsRecurring}
                  onChange={e => setNewStepIsRecurring(e.target.checked)}
                />
                Recurring?
              </label>
              {newStepIsRecurring && (
                <select
                  value={newStepRecurrenceType}
                  onChange={e => setNewStepRecurrenceType(e.target.value as 'daily' | 'weekly' | 'monthly')}
                  className="border rounded-lg px-2 py-1 text-sm text-gray-600">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              )}
            </div>
            <button type="submit" className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium self-end">Add</button>
          </form>

          {steps.some(s => s.recurrence_type) && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-600 mb-3">Recurring Habits</h3>
              <div className="flex flex-col gap-2">
                {steps.filter(s => s.recurrence_type).map(step => {
                  const todayDate = new Date()
                  const todayStr = new Date().toISOString().split('T')[0]
                  const stepDates = completions.filter(c => c.step_id === step.id).map(c => c.completed_date)
                  const doneToday = stepDates.includes(todayStr)
                  const streak = getStreak(step.id, step.recurrence_type!)
                  const streakUnit = step.recurrence_type === 'monthly' ? 'month' : step.recurrence_type === 'weekly' ? 'week' : 'day'

                  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                  const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
                  let historyItems: { label: string; completed: boolean; isFuture: boolean }[] = []

                  if (step.recurrence_type === 'daily') {
                    const dayOfWeek = todayDate.getDay()
                    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
                    const weekStart = new Date(todayDate)
                    weekStart.setDate(todayDate.getDate() + mondayOffset)
                    historyItems = Array.from({ length: 7 }, (_, i) => {
                      const d = new Date(weekStart)
                      d.setDate(weekStart.getDate() + i)
                      const dateStr = d.toISOString().split('T')[0]
                      const isFuture = dateStr > todayStr
                      const isToday = dateStr === todayStr
                      return { label: isToday ? 'Today' : dayLabels[d.getDay()], completed: !isFuture && stepDates.includes(dateStr), isFuture }
                    })
                  } else if (step.recurrence_type === 'weekly') {
                    const periodsToShow = Math.min(Math.max(streak, 1), 4)
                    historyItems = Array.from({ length: periodsToShow }, (_, i) => {
                      const weeksAgo = periodsToShow - 1 - i
                      const weekStart = new Date(todayDate)
                      weekStart.setDate(todayDate.getDate() - weeksAgo * 7 - todayDate.getDay())
                      const weekEnd = new Date(weekStart)
                      weekEnd.setDate(weekStart.getDate() + 6)
                      const completed = stepDates.some(d => { const date = new Date(d); return date >= weekStart && date <= weekEnd })
                      return { label: weeksAgo === 0 ? 'This' : `${weeksAgo}w`, completed, isFuture: false }
                    })
                  } else if (step.recurrence_type === 'monthly') {
                    const periodsToShow = Math.min(Math.max(streak, 1), 4)
                    historyItems = Array.from({ length: periodsToShow }, (_, i) => {
                      const monthsAgo = periodsToShow - 1 - i
                      const month = new Date(todayDate.getFullYear(), todayDate.getMonth() - monthsAgo, 1)
                      const completed = stepDates.some(d => { const date = new Date(d); return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth() })
                      return { label: monthsAgo === 0 ? 'This' : monthLabels[month.getMonth()], completed, isFuture: false }
                    })
                  }

                  return (
                    <div key={step.id} className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={doneToday}
                            onChange={() => handleToggleCompletion(step.id)}
                            className="w-4 h-4 accent-black cursor-pointer"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-800">{step.title}</p>
                              <span className="text-xs text-gray-400 capitalize">{step.recurrence_type}</span>
                            </div>
                            {streak > 0 && (
                              <p className="text-xs text-orange-500 mt-0.5">🔥 {streak} {streakUnit} streak</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteStep(step.id)}
                          className="text-gray-300 hover:text-red-400 text-xs ml-2 shrink-0">
                          ✕
                        </button>
                      </div>
                      <div className="mt-3 flex gap-2">
                        {historyItems.map((item, i) => (
                          <div key={i} className="flex flex-col items-center gap-1">
                            <div className={`w-6 h-6 rounded-full ${item.completed ? 'bg-black' : item.isFuture ? 'bg-gray-50 border border-dashed border-gray-200' : 'bg-gray-200'}`} />
                            <span className="text-xs text-gray-400">{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 gap-4">
            {COLUMNS.map(col => (
              <div key={col.status} className={`${col.color} rounded-xl p-4`}>
                <h3 className="text-sm font-semibold text-gray-600 mb-3">
                  {col.label} ({steps.filter(s => !s.recurrence_type && s.status === col.status).length})
                </h3>
                <div className="flex flex-col gap-2">
                  {steps.filter(s => !s.recurrence_type && s.status === col.status).map(step => (
                    <div key={step.id} className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-gray-800">{step.title}</p>
                        <button
                          onClick={() => deleteStep(step.id)}
                          className="text-gray-300 hover:text-red-400 text-xs ml-2 shrink-0">
                          ✕
                        </button>
                      </div>
                      {step.deadline && (
                        <p className="text-xs text-gray-400 mt-1">
                          Due: {new Date(step.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                      <select
                        value={step.status}
                        onChange={e => updateStatus(step.id, e.target.value as Step['status'])}
                        className="mt-2 text-xs text-gray-500 bg-transparent w-full border-0 outline-none cursor-pointer">
                        <option value="todo">Todo</option>
                        <option value="in_progress">In Progress</option>
                        <option value="blocked">Blocked</option>
                        <option value="done">Done</option>
                      </select>
                    </div>
                  ))}
                  {steps.filter(s => !s.recurrence_type && s.status === col.status).length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">No steps</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
