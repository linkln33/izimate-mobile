/**
 * Image URL utilities for mobile platform (React Native)
 * Handles normalization of photo URLs from various sources
 * Compatible with React Native Image component
 */

const BASE_URL = 'https://www.izimate.com'

/**
 * Normalize a photo URL to a full absolute URL
 * Handles:
 * - Already full URLs (http/https/data URLs) - returns as-is
 * - Cloudflare R2 URLs - preserves as-is (primary storage)
 * - Supabase Storage URLs - preserves as-is (legacy support)
 * - Relative paths starting with / - converts to full URL
 * - Filenames - prepends /picture/ path
 */
export function normalizePhotoUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return ''
  }

  const trimmedUrl = url.trim()

  // If already a full URL (http/https/data), return as-is
  // This includes R2 URLs (r2.dev, r2.cloudflarestorage.com) and Supabase Storage URLs
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://') || trimmedUrl.startsWith('data:')) {
    // R2 URLs: https://pub-{account-id}.r2.dev/{path} or custom domain
    // Supabase Storage URLs: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
    // Both are valid, return as-is
    return trimmedUrl
  }

  // If it's a relative path starting with /, convert to full URL
  if (trimmedUrl.startsWith('/')) {
    return `${BASE_URL}${trimmedUrl}`
  }

  // If it doesn't start with /, assume it's a filename and prepend /picture/
  return `${BASE_URL}/picture/${trimmedUrl}`
}

/**
 * Normalize an array of photo URLs
 */
export function normalizePhotoUrls(urls: (string | null | undefined)[] | null | undefined): string[] {
  if (!urls || !Array.isArray(urls)) {
    return []
  }

  return urls
    .filter((url): url is string => url != null && typeof url === 'string' && url.trim().length > 0)
    .map(normalizePhotoUrl)
}

/**
 * Get the first valid photo from a listing's photos array
 * Returns null if no valid photos found
 */
export function getMainPhoto(photos: (string | null | undefined)[] | null | undefined): string | null {
  if (!photos || !Array.isArray(photos) || photos.length === 0) {
    return null
  }

  const validPhotos = photos.filter(
    (photo): photo is string => photo != null && typeof photo === 'string' && photo.trim().length > 0
  )

  if (validPhotos.length === 0) {
    return null
  }

  // Get the first valid photo and normalize it
  const firstPhoto = validPhotos[0]
  const normalized = normalizePhotoUrl(firstPhoto)
  
  // Debug logging to help diagnose issues
  if (__DEV__) {
    console.log('🖼️ getMainPhoto:', {
      original: firstPhoto,
      normalized,
      allPhotos: validPhotos,
    })
  }
  
  return normalized
}

/**
 * Get all valid photos from a listing's photos array
 */
export function getAllPhotos(photos: (string | null | undefined)[] | null | undefined): string[] {
  return normalizePhotoUrls(photos)
}

/**
 * Upload a single image to Cloudflare R2 via API route
 * For mobile React Native - uses file URI instead of File object
 * 
 * Requires EXPO_PUBLIC_API_URL to be set to your web app URL
 */
export async function uploadImage(
  imageUri: string,
  folder: string = 'listings'
): Promise<string> {
  try {
    // Get API base URL from environment or use default
    const apiBaseUrl = 
      process.env.EXPO_PUBLIC_API_URL || 
      process.env.EXPO_PUBLIC_SITE_URL || 
      'https://www.izimate.com'
    
    // Remove trailing slash if present
    const baseUrl = apiBaseUrl.replace(/\/$/, '')
    const uploadUrl = `${baseUrl}/api/upload-image`

    if (__DEV__) {
      console.log('📤 Uploading image to R2:', {
        imageUri,
        folder,
        uploadUrl,
      })
    }

    // Create FormData for API request
    // React Native FormData accepts objects with uri, type, and name properties
    const formData = new FormData()
    
    // Get file extension from URI
    const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `image.${fileExt}`
    
    // Determine MIME type
    let mimeType = 'image/jpeg'
    if (fileExt === 'png') mimeType = 'image/png'
    else if (fileExt === 'webp') mimeType = 'image/webp'
    else if (fileExt === 'gif') mimeType = 'image/gif'
    
    // Append file to FormData
    // React Native FormData format: { uri, type, name }
    formData.append('file', {
      uri: imageUri,
      type: mimeType,
      name: fileName,
    } as any)
    
    formData.append('folder', folder)
    formData.append('optimize', 'true')

    // Upload to R2 via API route
    let uploadResponse: Response
    try {
      uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type - let fetch set it with boundary for FormData
        },
      })
    } catch (fetchError: any) {
      console.error('❌ Network error during upload:', fetchError)
      
      // Check if it's a CORS error (common error messages)
      const errorMessage = fetchError?.message || String(fetchError || '')
      const isCorsError = 
        errorMessage.includes('CORS') || 
        errorMessage.includes('Access-Control-Allow-Origin') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError') ||
        (typeof window !== 'undefined' && errorMessage.includes('blocked by CORS policy'))
      
      if (isCorsError) {
        const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'unknown'
        throw new Error(
          `CORS Error: The upload API at ${baseUrl}/api/upload-image is blocking requests from ${currentOrigin}. ` +
          `Please configure CORS on your server to allow requests from your development origin. ` +
          `You may need to add ${currentOrigin} to the allowed origins in your API route configuration.`
        )
      }
      
      throw new Error(
        `Failed to connect to upload service. Please check your internet connection and ensure EXPO_PUBLIC_API_URL is set correctly. (${uploadUrl})`
      )
    }

    if (!uploadResponse.ok) {
      let errorData: any = {}
      try {
        errorData = await uploadResponse.json()
      } catch (parseError) {
        // Response is not JSON, use status text
        console.warn('⚠️ Upload error response is not JSON')
      }
      
      const errorMessage = errorData.error || errorData.message || `Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`
      
      if (__DEV__) {
        console.error('❌ R2 upload error:', {
          status: uploadResponse.status,
          statusText: uploadResponse.statusText,
          error: errorMessage,
          uploadUrl,
        })
      }
      
      // Provide more helpful error messages
      if (uploadResponse.status === 404) {
        throw new Error(
          `Upload endpoint not found at ${uploadUrl}. ` +
          `Please ensure:\n` +
          `1. The web app is running and accessible at ${baseUrl}\n` +
          `2. The API route /api/upload-image exists in your Next.js app\n` +
          `3. If testing locally, set EXPO_PUBLIC_API_URL to your local server (e.g., http://localhost:3000)`
        )
      } else if (uploadResponse.status === 500) {
        throw new Error('Server error during upload. Please try again later or contact support.')
      } else if (uploadResponse.status === 413) {
        throw new Error('Image file is too large. Please choose a smaller image.')
      }
      
      throw new Error(errorMessage)
    }

    const data = await uploadResponse.json()
    
    if (!data.url) {
      throw new Error('No URL returned from upload service')
    }

    // Log the URL for debugging
    if (__DEV__) {
      console.log('✅ Image uploaded successfully to R2:', {
        folder,
        url: data.url,
      })
    }

    // Ensure we return a full URL
    if (!data.url || (!data.url.startsWith('http://') && !data.url.startsWith('https://'))) {
      console.error('❌ Invalid URL returned from R2:', data.url)
      throw new Error('Invalid URL returned from storage')
    }

    return data.url
  } catch (error: any) {
    console.error('❌ Image upload error:', error)
    throw new Error(error?.message || 'Failed to upload image')
  }
}

/**
 * Upload multiple images to Cloudflare R2 via API route
 * For mobile React Native - uses file URIs instead of File objects
 */
export async function uploadMultipleImages(
  imageUris: string[],
  folder: string = 'listings'
): Promise<string[]> {
  try {
    if (__DEV__) {
      console.log('📤 Uploading multiple images to R2:', {
        count: imageUris.length,
        folder,
      })
    }
    
    const uploadPromises = imageUris.map((uri) => uploadImage(uri, folder))
    const uploadedUrls = await Promise.all(uploadPromises)
    
    if (__DEV__) {
      console.log('✅ All images uploaded successfully:', uploadedUrls.length)
    }
    
    return uploadedUrls
  } catch (error: any) {
    console.error('❌ Multiple image upload error:', error)
    throw new Error(error?.message || 'Failed to upload images')
  }
}
