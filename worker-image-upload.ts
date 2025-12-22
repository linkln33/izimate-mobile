/**
 * Cloudflare Worker for handling image uploads from web browsers
 * This bypasses CORS issues by handling uploads server-side
 */

interface Env {
  IZIMATE_JOB_IMAGES: R2Bucket
  R2_ACCESS_KEY_ID: string
  R2_SECRET_ACCESS_KEY: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS headers for web requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*', // In production, restrict to your domain
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
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
      // Parse the multipart form data
      const formData = await request.formData()
      const file = formData.get('file') as File
      const folder = formData.get('folder') as string || 'listings'

      if (!file) {
        return new Response(JSON.stringify({ error: 'No file provided' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        return new Response(JSON.stringify({ error: 'File must be an image' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: 'File too large (max 10MB)' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Generate unique filename
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(2, 15)
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 
                     file.type.split('/')[1] || 'jpg'
      const fileName = `${folder}/${timestamp}-${random}.${fileExt}`

      // Upload to R2
      await env.IZIMATE_JOB_IMAGES.put(fileName, file.stream(), {
        httpMetadata: {
          contentType: file.type,
        },
      })

      // Construct public URL (using the bucket's actual public URL)
      const publicUrl = `https://pub-fc05c194e2724d46965bee358f23e49a.r2.dev/${fileName}`

      return new Response(JSON.stringify({ 
        url: publicUrl,
        fileName,
        size: file.size,
        type: file.type
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } catch (error: any) {
      console.error('Upload error:', error)
      return new Response(JSON.stringify({ 
        error: 'Upload failed',
        message: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  },
}
