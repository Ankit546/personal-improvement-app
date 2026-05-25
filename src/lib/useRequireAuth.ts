                                                                                                        
import { useEffect } from 'react'                                                                                  
import { useRouter } from 'next/navigation'                                                                        
import { createClient } from './supabase'                                                                          
                                                                                                                    
export function useRequireAuth() {                                                                                 
const router = useRouter()                                                                                       
const supabase = createClient()                                                                                  
                                                                                                                    
useEffect(() => {                                                                                                
    supabase.auth.getUser().then(({ data }) => {                                                                   
    if (!data.user) router.push('/login')                                                                      
    })                                      
}, [])                                
}
    