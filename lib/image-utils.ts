/**
 * Image optimization utilities for avatar and image uploads
 */

// Supported image types that can be compressed
const SUPPORTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp']

/**
 * Check if a file type is supported for compression
 */
function isSupportedImageType(file: File): boolean {
  return SUPPORTED_TYPES.includes(file.type.toLowerCase())
}

/**
 * Compress and resize an image file
 * @param file - The original image file
 * @param maxWidth - Maximum width in pixels (default: 256 for avatars)
 * @param maxHeight - Maximum height in pixels (default: 256 for avatars)
 * @param quality - JPEG quality 0-1 (default: 0.8)
 * @returns Compressed image as Blob, or original file if compression fails/not supported
 */
export async function compressImage(
  file: File,
  maxWidth: number = 256,
  maxHeight: number = 256,
  quality: number = 0.8
): Promise<Blob> {
  // If file type not supported, return original file
  if (!isSupportedImageType(file)) {
    console.warn(`⚠️ Image type ${file.type} not supported for compression, uploading original`)
    return file
  }

  // If file is already small enough (under 100KB), skip compression
  if (file.size < 100 * 1024) {
    console.log(`⏭️ Image already small (${(file.size / 1024).toFixed(1)}KB), skipping compression`)
    return file
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    // Set a timeout to prevent hanging on problematic images
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(img.src)
      console.warn('⚠️ Image compression timed out, uploading original')
      resolve(file) // Return original on timeout instead of failing
    }, 10000) // 10 second timeout

    img.onload = () => {
      clearTimeout(timeout)
      URL.revokeObjectURL(img.src) // Clean up object URL
      
      try {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img
        
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height

        if (!ctx) {
          console.warn('⚠️ Could not get canvas context, uploading original')
          resolve(file)
          return
        }

        // Fill with white background (for transparent PNGs)
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const reduction = Math.round((1 - blob.size / file.size) * 100)
              if (process.env.NODE_ENV === 'development') {
                console.log(`🖼️ Image compressed: ${(file.size / 1024).toFixed(1)}KB → ${(blob.size / 1024).toFixed(1)}KB (${reduction}% reduction)`)
              }
              resolve(blob)
            } else {
              console.warn('⚠️ Blob creation failed, uploading original')
              resolve(file)
            }
          },
          'image/jpeg',
          quality
        )
      } catch (err) {
        console.warn('⚠️ Compression error, uploading original:', err)
        resolve(file)
      }
    }

    img.onerror = () => {
      clearTimeout(timeout)
      URL.revokeObjectURL(img.src)
      console.warn('⚠️ Failed to load image for compression, uploading original')
      resolve(file) // Return original on error instead of failing
    }

    // Load the image from file
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Compress an avatar image (256x256, high quality)
 */
export async function compressAvatar(file: File): Promise<Blob> {
  return compressImage(file, 256, 256, 0.85)
}

/**
 * Compress a task image (larger, for task photos)
 */
export async function compressTaskImage(file: File): Promise<Blob> {
  return compressImage(file, 1200, 1200, 0.8)
}
