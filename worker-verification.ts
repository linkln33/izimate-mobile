/**
 * Cloudflare Worker for handling Didit verification API calls
 * This bypasses CORS issues by handling API calls server-side
 */

interface Env {
  DIDIT_API_KEY: string
  DIDIT_WORKFLOW_ID: string
  SITE_URL: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS headers for web requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*', // In production, restrict to your domain
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: corsHeaders 
      })
    }

    try {
      const body = await request.json()
      const { type, user_id } = body

      if (!type || !user_id) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: type and user_id' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const diditApiKey = env.DIDIT_API_KEY || 'AsiGVVkU_5tKEwQdR2OkTVjh6Gp3eTicnF6dSW-qQmQ'
      const diditWorkflowId = env.DIDIT_WORKFLOW_ID || '694ea16c-7c1c-41dc-acdc-a191ac4cf67c'
      const siteUrl = env.SITE_URL || 'https://izimate.com'
      const diditBaseUrl = 'https://api.didit.me'

      // Prepare Didit API request
      const diditPayload: any = {
        workflow_id: type === 'identity' ? diditWorkflowId : 'business_verification',
        user_reference: user_id,
        redirect_url: `${siteUrl}/verification/callback`,
        webhook_url: `${siteUrl}/api/verification/webhook`,
        settings: {
          language: 'en',
          theme: {
            primary_color: '#f25842',
          }
        }
      }

      // Add business-specific data if needed
      if (type === 'business' && body.business_data) {
        diditPayload.prefill_data = {
          company_name: body.business_data.companyName || '',
          registration_number: body.business_data.registrationNumber || '',
          country: body.business_data.country || 'GB',
          address: body.business_data.address || '',
        }
        diditPayload.checks = [
          'business_registration',
          'aml_screening',
          'address_verification',
          'beneficial_ownership'
        ]
      }

      // Call Didit API server-side
      const response = await fetch(`${diditBaseUrl}/v1/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${diditApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(diditPayload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create Didit session' }))
        return new Response(
          JSON.stringify({ error: errorData.error || 'Failed to create Didit session' }),
          {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const data = await response.json()

      return new Response(
        JSON.stringify({
          session_id: data.session_id,
          verification_url: data.verification_url,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } catch (error: any) {
      console.error('Verification worker error:', error)
      return new Response(
        JSON.stringify({ error: error.message || 'Internal server error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
  }
}

