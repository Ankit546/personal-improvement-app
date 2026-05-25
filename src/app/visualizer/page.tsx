'use client'                                                                                                       
                                                                                                                     
  import { useEffect, useState } from 'react'                                                                        
  import { createClient } from '@/lib/supabase'                                                                      
  import Link from 'next/link'                                                                                       
  import { useRequireAuth } from '@/lib/useRequireAuth'                                                              
                                                                                                               
  type Goal = {
    id: string                                                                                                       
    title: string                                                                                                  
    current_value: string                 
    target_value: string
    progress_percent: number
    deadline: string | null                                                                                    
  }
                                                                                                                     
  export default function VisualizerPage() {  
    useRequireAuth()                                                                     
    const [goals, setGoals] = useState<Goal[]>([])
    const supabase = createClient()
                                                                                                                     
    useEffect(() => {
      async function fetchGoals() {                                                                                  
        const { data } = await supabase.from('goals').select('*')                                                  
        setGoals(data ?? [])              
      }
      fetchGoals()                                                                                                   
    }, [])
                                                                                                                     
    const overallProgress = goals.length                                                                           
      ? Math.round(goals.reduce((sum, g) => sum + g.progress_percent, 0) / goals.length)
      : 0
                                                                                                                     
    return (
      <div className="min-h-screen bg-gray-50 p-8">                                                                  
        <div className="max-w-4xl mx-auto">                                                                        
          <div className="flex justify-between items-center mb-10">
            <h1 className="text-2xl font-bold">Your Journey</h1>
            <Link href="/dashboard" className="text-sm text-gray-400 hover:text-black">← Dashboard</Link>            
          </div>                              
                                                                                                                     
          {/* Timeline */}                                                                                           
          <div className="relative mb-16">                                                                           
            <div className="flex justify-between text-xs text-gray-400 mb-2">                                        
              <span>Reality</span>                                                                                   
              <span>Expectation</span>                                                                             
            </div>
                                                                                                                     
            <div className="relative h-3 bg-gray-200 rounded-full">
              <div                                                                                                   
                className="h-3 bg-black rounded-full transition-all duration-700"                                    
                style={{ width: `${overallProgress}%` }}
              />                                                                                                     
              {/* Avatar */}                                                                                       
              <div                                                                                                   
                className="absolute -top-6 transition-all duration-700"
                style={{ left: `calc(${overallProgress}% - 12px)` }}>                                                
                <div className="text-2xl">🧑</div>                                                                 
              </div>                                                                                                 
            </div>
                                                                                                                     
            <div className="flex justify-between mt-3">                                                            
              <span className="text-xs font-medium text-gray-500">0%</span>                                          
              <span className="text-sm font-semibold text-black">{overallProgress}% of the way there</span>        
              <span className="text-xs font-medium text-gray-500">100%</span>                                        
            </div>                        
          </div>                                                                                                     
                                                                                                                     
          {/* Goals comparison */}                                                                                   
          <div className="flex flex-col gap-4">                                                                      
            {goals.map(goal => (                                                                                   
              <div key={goal.id} className="bg-white rounded-xl p-5 shadow-sm">                                      
                <div className="flex justify-between items-start mb-3">
                  <h2 className="font-semibold text-gray-800">{goal.title}</h2>                                      
                  <span className="text-sm font-medium text-gray-500">{goal.progress_percent}%</span>              
                </div>                                                                                               
                <div className="flex gap-4 text-sm">
                  <div className="flex-1 bg-gray-50 rounded-lg p-3">                                                 
                    <p className="text-xs text-gray-400 mb-1">Now</p>                                                
                    <p className="font-medium text-gray-700">{goal.current_value || '—'}</p>                         
                  </div>                                                                                             
                  <div className="flex-1 bg-black rounded-lg p-3">                                                   
                    <p className="text-xs text-gray-400 mb-1">Target</p>                                             
                    <p className="font-medium text-white">{goal.target_value || '—'}</p>                             
                  </div>    

                </div>
                {goal.deadline && (
    <p className="text-xs text-gray-400 mb-3">
      Due: {new Date(goal.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
    </p>                                      
  )}                                                                                                  
                <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">                                         
                  <div                                                                                               
                    className="bg-black h-1.5 rounded-full"
                    style={{ width: `${goal.progress_percent}%` }}                                                   
                  />                                                                                                 
                </div>                    
              </div>                                                                                                 
            ))}                                                                                                      
   
            {goals.length === 0 && (                                                                                 
              <p className="text-center text-gray-400 py-10">No goals yet. <Link href="/dashboard"                 
  className="underline">Add some.</Link></p>  
            )}                            
          </div>                              
        </div>                                                                                                       
      </div>
    )                                                                                                                
  }         