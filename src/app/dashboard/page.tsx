'use client'

import Link from 'next/link'   
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRequireAuth } from '@/lib/useRequireAuth'                                                              
type Goal = {
  id: string
  title: string
  description: string
  current_value: string
  target_value: string
  progress_percent: number
  deadline: string | null
}

export default function DashboardPage() {
  useRequireAuth()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    current_value: '',
    target_value: '',
    deadline: ''
  })
  const [totalPoints, setTotalPoints] = useState(0)                                                                
  const supabase = createClient()

  useEffect(() => {
    async function fetchGoals() {
        const { data: pointsData } = await supabase.from('user_points').select('points')
        const total = pointsData?.reduce((sum, row) => sum + row.points, 0) ?? 0         
        setTotalPoints(total)                                          
      const { data } = await supabase.from('goals').select('*')
      setGoals(data ?? [])
      setLoading(false)
    }
    fetchGoals()
  }, [])

  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('goals').insert({
      ...newGoal,
      user_id: user!.id,
      progress_percent: 0,
    })
    setShowModal(false)
    setNewGoal({ title: '', description: '', current_value: '', target_value: '' , deadline: ''})
    const { data } = await supabase.from('goals').select('*')
    setGoals(data ?? [])
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Goals</h1>
            <div className="flex gap-4 mt-1">
              <p className="text-sm text-gray-400">{totalPoints} points earned</p>
              <Link href="/visualizer" className="text-sm text-gray-400 hover:text-black">View Journey →</Link>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium">
            + Add Goal
          </button>
        </div>

        {loading && <p className="text-gray-400">Loading...</p>}

        {!loading && goals.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-xl">No goals yet.</p>
            <p className="text-sm mt-2">Add your first goal to get started.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map(goal => (
            <Link href={`/dashboard/${goal.id}`} key={goal.id}>
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <h2 className="text-lg font-semibold">{goal.title}</h2>
              <p className="text-gray-500 text-sm mt-1">{goal.description}</p>
              {goal.deadline && (
    <p className="text-xs text-gray-400 mt-2">                                                                       
      Due: {new Date(goal.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
    </p>                                                                                                             
  )}       
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Progress</span>
                  <span className="font-medium">{goal.progress_percent}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-black h-2 rounded-full"
                    style={{ width: `${goal.progress_percent}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between mt-4 text-sm text-gray-500">
                <span>Now: {goal.current_value}</span>
                <span>Target: {goal.target_value}</span>
              </div>
            </div>
            </Link>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Goal</h2>
            <form onSubmit={handleAddGoal} className="flex flex-col gap-3">
              <input className="border rounded-lg p-3" placeholder="Goal title" value={newGoal.title} onChange={e => setNewGoal({ ...newGoal, title: e.target.value })} required />
              <input className="border rounded-lg p-3" placeholder="Description" value={newGoal.description} onChange={e => setNewGoal({ ...newGoal, description: e.target.value })} />
              <input className="border rounded-lg p-3" placeholder="Current value (e.g. 25% body fat)" value={newGoal.current_value} onChange={e => setNewGoal({ ...newGoal, current_value: e.target.value })} />
              <input className="border rounded-lg p-3" placeholder="Target value (e.g. 15% body fat)" value={newGoal.target_value} onChange={e => setNewGoal({ ...newGoal, target_value: e.target.value })} />
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-500">Goal Deadline</label>
                <input className="border rounded-lg p-3" type="date" value={newGoal.deadline} onChange={e => setNewGoal({ ...newGoal, deadline: e.target.value })} />
              </div>   
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border rounded-lg p-3 text-sm">Cancel</button>
                <button type="submit" className="flex-1 bg-black text-white rounded-lg p-3 text-sm font-medium">Save Goal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
