import { NextRequest, NextResponse } from 'next/server'                                                            
  import OpenAI from 'openai'                                                                                        
                                                                                                                     
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })                                                  
                                                                                                                     
  export async function POST(req: NextRequest) {                                                                     
    const { goalTitle, goalDescription, userContext } = await req.json()                                           
                                                                                                                     
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',                                                                                          
      messages: [                                                                                                  
        {
          role: 'system',
          content: 'You are a personal improvement coach. When given a goal and context, return exactly 5 actionable steps as a JSON array of strings. No explanation, just the array.',                                            
        },                                                                                                           
        {                                                                                                            
          role: 'user',                                                                                            
          content: `Goal: ${goalTitle}\nDescription: ${goalDescription}\nMy situation: ${userContext}`,
        },                                                                                                           
      ],
      response_format: { type: 'json_object' },                                                                      
    })                                                                                                               
   
    const content = completion.choices[0].message.content ?? '{}'                                                    
    const parsed = JSON.parse(content)                                                                             
    const steps: string[] = parsed.steps ?? []
                                                                                                                     
    return NextResponse.json({ steps })
  }     