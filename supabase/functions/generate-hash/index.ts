import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { entryData } = await req.json()
    
    // Validate required fields
    if (!entryData || !entryData.id || !entryData.sheetId || !entryData.firstName || !entryData.lastName) {
      throw new Error('Missing required fields: id, sheetId, firstName, lastName')
    }
    
    // Create a unique string from the entry data
    const dataString = JSON.stringify({
      id: entryData.id,
      sheetId: entryData.sheetId,
      firstName: entryData.firstName.toLowerCase().trim(),
      lastName: entryData.lastName.toLowerCase().trim(),
      timestamp: entryData.timestamp,
      createdAt: entryData.createdAt,
      email: entryData.email?.toLowerCase().trim() || '',
      phone: entryData.phone?.trim() || '',
      rank: entryData.rank?.trim() || '',
      badgeNumber: entryData.badgeNumber?.trim() || '',
      unit: entryData.unit?.trim() || '',
      age: entryData.age || 0,
      // Add a secret salt to prevent hash collisions
      salt: 'muster-sheets-attendance-2024'
    })

    // Generate SHA256 hash using Web Crypto API (available in Deno)
    const encoder = new TextEncoder()
    const data = encoder.encode(dataString)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    
    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    return new Response(
      JSON.stringify({ 
        hash,
        success: true,
        message: 'Hash generated successfully'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('Hash generation error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      { 
        status: 400, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
}) 