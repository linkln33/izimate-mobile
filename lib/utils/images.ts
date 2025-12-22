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

  // Handle blob URLs FIRST - return as-is (they're valid for local preview)
  // Check for blob: protocol (case-insensitive)
  const lowerUrl = trimmedUrl.toLowerCase()
  if (lowerUrl.startsWith('blob:')) {
    if (__DEV__) {
      console.log('🖼️ normalizePhotoUrl: Preserving blob URL as-is:', trimmedUrl)
    }
    return trimmedUrl
  }
  
  // Also check if it contains blob: anywhere (in case of malformed URLs)
  if (trimmedUrl.includes('blob:') && !trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    if (__DEV__) {
      console.warn('⚠️ normalizePhotoUrl: Found blob: in URL, preserving as-is:', trimmedUrl)
    }
    return trimmedUrl
  }

  // If already a full URL (http/https/data), return as-is
  // This includes R2 URLs (r2.dev, r2.cloudflarestorage.com) and Supabase Storage URLs
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://') || trimmedUrl.startsWith('data:')) {
    // R2 URLs: https://pub-{account-id}.r2.dev/{object-key}
    // Expected format: https://pub-f6e513ef2a7ef932e869758dba577bbb.r2.dev/listings/filename.webp
    // Supabase Storage URLs: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
    // Both are valid, return as-is
    
    // Debug: Log R2 URLs to verify format
    if (__DEV__ && trimmedUrl.includes('r2.dev')) {
      const isR2Format = /^https:\/\/pub-[a-f0-9]+\.r2\.dev\/.+/.test(trimmedUrl)
      if (!isR2Format) {
        console.warn('⚠️ R2 URL format might be incorrect:', {
          url: trimmedUrl,
          expected: 'https://pub-{account-id}.r2.dev/{object-key}',
          actual: trimmedUrl,
        })
      }
    }
    
    return trimmedUrl
  }

  // If it's a relative path starting with /, convert to full URL
  if (trimmedUrl.startsWith('/')) {
    return `${BASE_URL}${trimmedUrl}`
  }

  // If it doesn't start with /, assume it's a filename and prepend /picture/
  // But check if it's already a blob URL that somehow got here (double-check)
  if (trimmedUrl.toLowerCase().startsWith('blob:') || trimmedUrl.includes('blob:')) {
    if (__DEV__) {
      console.error('❌ normalizePhotoUrl: Blob URL reached fallback path! This should not happen:', trimmedUrl)
    }
    return trimmedUrl
  }
  
  if (__DEV__) {
    console.log('🖼️ normalizePhotoUrl: Treating as filename, prepending /picture/:', trimmedUrl)
  }
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
 * Upload a single image directly to Cloudflare R2 using S3-compatible API
 * For mobile React Native - uses file URI instead of File object
 * 
 * Requires R2 credentials in environment variables:
 * - EXPO_PUBLIC_R2_ACCOUNT_ID
 * - EXPO_PUBLIC_R2_ACCESS_KEY_ID
 * - EXPO_PUBLIC_R2_SECRET_ACCESS_KEY
 */
export async function uploadImage(
  imageUri: string,
  folder: string = 'listings'
): Promise<string> {
  try {
    // Get R2 credentials from environment
    const accountId = process.env.EXPO_PUBLIC_R2_ACCOUNT_ID || 'f6e513ef2a7ef932e869758dba577bbb'
    const accessKeyId = process.env.EXPO_PUBLIC_R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.EXPO_PUBLIC_R2_SECRET_ACCESS_KEY
    
    // Use separate bucket for profile pictures (avatars)
    // All other images go to izimate-job-images bucket
    const bucketName = folder === 'avatars' ? 'izimate-user-avatars' : 'izimate-job-images'
    
    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        'R2 credentials not configured. Please set EXPO_PUBLIC_R2_ACCESS_KEY_ID and EXPO_PUBLIC_R2_SECRET_ACCESS_KEY in your .env file.'
      )
    }

    // R2 S3-compatible endpoint
    const r2Endpoint = `https://${accountId}.r2.cloudflarestorage.com`
    const publicUrlBase = `https://pub-${accountId}.r2.dev`

    if (__DEV__) {
      console.log('📤 Uploading image directly to R2:', {
        imageUri,
        folder,
        bucketName,
        accountId,
      })
    }

    // Read the image file
    // Handle both web (blob:) and native (file://, content://) URIs
    let imageBlob: Blob
    try {
      if (__DEV__) {
        console.log('📁 Reading image file from URI:', {
          uri: imageUri,
          isBlob: imageUri.startsWith('blob:'),
          isFile: imageUri.startsWith('file://'),
          isContent: imageUri.startsWith('content://'),
        })
      }
      
      // For React Native, fetch works with file:// and content:// URIs
      // For web, fetch works with blob: URIs
      const fileResponse = await fetch(imageUri)
      if (!fileResponse.ok) {
        throw new Error(`Failed to read image file: ${fileResponse.status} ${fileResponse.statusText}`)
      }
      imageBlob = await fileResponse.blob()
      
      if (__DEV__) {
        console.log('✅ Image file read successfully:', {
          size: imageBlob.size,
          type: imageBlob.type,
        })
      }
    } catch (fileError: any) {
      console.error('❌ Error reading image file:', fileError)
      throw new Error(`Failed to read image file: ${fileError?.message || 'Unknown error'}`)
    }

    // Generate unique filename
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)
    const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg'
    // For avatars in separate bucket, don't use folder prefix (bucket is already dedicated)
    // For other images, use folder prefix
    const fileName = folder === 'avatars' 
      ? `${timestamp}-${random}.${fileExt}`
      : `${folder}/${timestamp}-${random}.${fileExt}`
    
    // Determine MIME type
    let contentType = 'image/jpeg'
    if (fileExt === 'png') contentType = 'image/png'
    else if (fileExt === 'webp') contentType = 'image/webp'
    else if (fileExt === 'gif') contentType = 'image/gif'

    // Use AWS SDK v3 for S3-compatible uploads (works on both web and native)
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
    
    const s3Client = new S3Client({
      region: 'auto', // Required by SDK but not used by R2
      endpoint: r2Endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })

    // Upload to R2 using PutObjectCommand
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: fileName,
          Body: imageBlob,
          ContentType: contentType,
        })
      )
    } catch (s3Error: any) {
      console.error('❌ R2 upload failed:', s3Error)
      
      // Handle specific AWS SDK errors
      if (s3Error.name === 'Forbidden' || s3Error.$metadata?.httpStatusCode === 403) {
        throw new Error('Access denied to R2 bucket. Please check your R2 credentials and bucket permissions.')
      } else if (s3Error.name === 'NotFound' || s3Error.$metadata?.httpStatusCode === 404) {
        throw new Error('R2 bucket not found. Please check your bucket name and account ID.')
      } else if (s3Error.$metadata?.httpStatusCode === 413) {
        throw new Error('Image file is too large. Please choose a smaller image.')
      }
      
      throw new Error(`R2 upload failed: ${s3Error.message || 'Unknown error'}`)
    }

    // Construct public URL
    const finalUrl = `${publicUrlBase}/${fileName}`

    if (__DEV__) {
      console.log('✅ Image uploaded successfully to R2:', {
        folder,
        fileName,
        url: finalUrl,
        size: imageBlob.size,
      })
    }

    // Verify the URL is accessible (non-blocking, async check)
    if (__DEV__) {
      setTimeout(async () => {
        try {
          const testResponse = await fetch(finalUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
          if (!testResponse.ok) {
            console.warn('⚠️ Uploaded image URL returned non-OK status (may need time to propagate):', {
              url: finalUrl,
              status: testResponse.status,
              statusText: testResponse.statusText,
            })
          } else {
            console.log('✅ Uploaded image URL is accessible:', finalUrl)
          }
        } catch (testError: any) {
          if (__DEV__) {
            console.log('ℹ️ URL verification check (non-blocking):', {
              url: finalUrl,
              note: 'Image may need a moment to be accessible',
            })
          }
        }
      }, 100)
    }

    return finalUrl
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
