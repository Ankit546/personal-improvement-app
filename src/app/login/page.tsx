'use client'                                                                                                       
   
  import { useState } from 'react'                                                                                   
  import { createClient } from '@/lib/supabase'                                                                    
  import { useRouter } from 'next/navigation'                                                                        
                                                                                                                   
  export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')                                                                     
    const [isSignUp, setIsSignUp] = useState(false)
    const [error, setError] = useState('')                                                                           
    const router = useRouter()                                                                                       
    const supabase = createClient()
                                                                                                                     
    async function handleSubmit(e: React.FormEvent) {                                                              
      e.preventDefault()
      setError('')
                                                                                                                     
      const { error } = isSignUp
        ? await supabase.auth.signUp({ email, password })                                                            
        : await supabase.auth.signInWithPassword({ email, password })                                              

      if (error) {                                                                                                   
        setError(error.message)
      } else {                                                                                                       
        router.push('/dashboard')                                                                                  
      }
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow w-full max-w-md">                                             
          <h1 className="text-2xl font-bold mb-6">{isSignUp ? 'Create account' : 'Sign in'}</h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">                                             
            <input className="border rounded-lg p-3" type="email" placeholder="Email" value={email} onChange={e =>   
  setEmail(e.target.value)} required />                                                                              
            <input className="border rounded-lg p-3" type="password" placeholder="Password" value={password}         
  onChange={e => setPassword(e.target.value)} required />                                                            
            {error && <p className="text-red-500 text-sm">{error}</p>}                                             
            <button className="bg-black text-white rounded-lg p-3 font-medium" type="submit">                        
              {isSignUp ? 'Sign up' : 'Sign in'}                                                                     
            </button>                                                                                                
          </form>                                                                                                    
          <button className="mt-4 text-sm text-gray-500 underline" onClick={() => setIsSignUp(!isSignUp)}>           
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}                       
          </button>
        </div>                                                                                                       
      </div>                                                                                                       
    )                                                                                                                
  }