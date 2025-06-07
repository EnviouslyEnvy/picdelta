import type { ImageData as CustomImageData, ComparisonMetrics } from '../types'

// Cache for scaled images to avoid recomputation
const scaledImageCache = new Map<string, CustomImageData>()

// Helper to generate cache key
const getCacheKey = (file: File, width: number, height: number): string => {
  return `${file.name}-${file.size}-${width}x${height}`
}

// Utility to create scaled versions for different zoom levels
const createScaledImage = (sourceImage: CustomImageData, scale: number): CustomImageData => {
  const targetWidth = Math.round(sourceImage.width * scale)
  const targetHeight = Math.round(sourceImage.height * scale)
  
  const cacheKey = getCacheKey(sourceImage.file, targetWidth, targetHeight)
  
  if (scaledImageCache.has(cacheKey)) {
    return scaledImageCache.get(cacheKey)!
  }
  
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  
  canvas.width = targetWidth
  canvas.height = targetHeight
  
  // Use appropriate scaling method based on scale factor
  if (scale > 1) {
    context.imageSmoothingEnabled = false // Pixel art scaling
  } else {
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
  }
  
  context.drawImage(sourceImage.canvas, 0, 0, targetWidth, targetHeight)
  
  const scaledImage: CustomImageData = {
    file: sourceImage.file,
    canvas,
    context,
    width: targetWidth,
    height: targetHeight
  }
  
  // Cache result (limit cache size to avoid memory leaks)
  if (scaledImageCache.size > 20) {
    const firstKey = scaledImageCache.keys().next().value
    if (firstKey) {
      scaledImageCache.delete(firstKey)
    }
  }
  scaledImageCache.set(cacheKey, scaledImage)
  
  return scaledImage
}

export const loadImageToCanvas = async (file: File): Promise<CustomImageData> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      
      if (!context) {
        reject(new Error('Could not get canvas context'))
        return
      }
      
      // Optimize for large images by using a reasonable max size
      const maxDimension = 4096
      let { width, height } = img
      
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      
      canvas.width = width
      canvas.height = height
      
      // Use appropriate scaling for large images
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'
      context.drawImage(img, 0, 0, width, height)
      
      resolve({
        file,
        canvas,
        context,
        width,
        height
      })
    }
    
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

const getAspectRatio = (width: number, height: number): number => {
  return width / height
}

// Scale image to target dimensions
const scaleImageToMatch = (sourceImage: CustomImageData, targetWidth: number, targetHeight: number): CustomImageData => {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  
  canvas.width = targetWidth
  canvas.height = targetHeight
  
  // Use high-quality scaling for downscaling (current approach avoids upscaling)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  
  // Draw the source image scaled to the target dimensions
  context.drawImage(sourceImage.canvas, 0, 0, targetWidth, targetHeight)
  
  return {
    file: sourceImage.file,
    canvas,
    context,
    width: targetWidth,
    height: targetHeight
  }
}

export const prepareImagesForComparison = (img1: CustomImageData, img2: CustomImageData): { img1: CustomImageData, img2: CustomImageData } => {
  const ratio1 = getAspectRatio(img1.width, img1.height)
  const ratio2 = getAspectRatio(img2.width, img2.height)
  
  // Check if aspect ratios are the same (with small tolerance for floating point precision)
  const tolerance = 0.01
  if (Math.abs(ratio1 - ratio2) > tolerance) {
    throw new Error(`Images must have the same aspect ratio. Image 1: ${ratio1.toFixed(3)}, Image 2: ${ratio2.toFixed(3)}`)
  }
  
  // If dimensions are already the same, return as-is
  if (img1.width === img2.width && img1.height === img2.height) {
    return { img1, img2 }
  }
  
  // Scale to the SMALLER dimensions to avoid upscaling/interpolation
  const targetWidth = Math.min(img1.width, img2.width)
  const targetHeight = Math.min(img1.height, img2.height)
  
  let scaledImg1 = img1
  let scaledImg2 = img2
  
  if (img1.width !== targetWidth || img1.height !== targetHeight) {
    scaledImg1 = scaleImageToMatch(img1, targetWidth, targetHeight)
  }
  
  if (img2.width !== targetWidth || img2.height !== targetHeight) {
    scaledImg2 = scaleImageToMatch(img2, targetWidth, targetHeight)
  }
  
  return { img1: scaledImg1, img2: scaledImg2 }
}

export const calculateMSE = (img1Data: ImageData, img2Data: ImageData): number => {
  const data1 = img1Data.data
  const data2 = img2Data.data
  let sum = 0
  
  for (let i = 0; i < data1.length; i += 4) {
    const r1 = data1[i]
    const g1 = data1[i + 1]
    const b1 = data1[i + 2]
    const r2 = data2[i]
    const g2 = data2[i + 1]
    const b2 = data2[i + 2]
    
    sum += Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2)
  }
  
  return sum / (data1.length / 4 * 3)
}

export const calculatePSNR = (mse: number): number => {
  if (mse === 0) return Infinity
  return 20 * Math.log10(255 / Math.sqrt(mse))
}

export const calculateSSIM = (img1Data: ImageData, img2Data: ImageData): number => {
  // Simplified SSIM calculation for demonstration
  // In practice, you'd want a more robust implementation
  const data1 = img1Data.data
  const data2 = img2Data.data
  
  let mean1 = 0
  let mean2 = 0
  let variance1 = 0
  let variance2 = 0
  let covariance = 0
  
  const n = data1.length / 4
  
  // Calculate means
  for (let i = 0; i < data1.length; i += 4) {
    const gray1 = (data1[i] + data1[i + 1] + data1[i + 2]) / 3
    const gray2 = (data2[i] + data2[i + 1] + data2[i + 2]) / 3
    mean1 += gray1
    mean2 += gray2
  }
  mean1 /= n
  mean2 /= n
  
  // Calculate variances and covariance
  for (let i = 0; i < data1.length; i += 4) {
    const gray1 = (data1[i] + data1[i + 1] + data1[i + 2]) / 3
    const gray2 = (data2[i] + data2[i + 1] + data2[i + 2]) / 3
    variance1 += Math.pow(gray1 - mean1, 2)
    variance2 += Math.pow(gray2 - mean2, 2)
    covariance += (gray1 - mean1) * (gray2 - mean2)
  }
  variance1 /= n
  variance2 /= n
  covariance /= n
  
  const c1 = Math.pow(0.01 * 255, 2)
  const c2 = Math.pow(0.03 * 255, 2)
  
  const numerator = (2 * mean1 * mean2 + c1) * (2 * covariance + c2)
  const denominator = (mean1 * mean1 + mean2 * mean2 + c1) * (variance1 + variance2 + c2)
  
  return numerator / denominator
}

export const compareImages = (img1: CustomImageData, img2: CustomImageData): ComparisonMetrics => {
  // Prepare images for comparison (downscale to smaller resolution to avoid upscaling artifacts)
  const { img1: scaledImg1, img2: scaledImg2 } = prepareImagesForComparison(img1, img2)
  
  const img1Data = scaledImg1.context.getImageData(0, 0, scaledImg1.width, scaledImg1.height)
  const img2Data = scaledImg2.context.getImageData(0, 0, scaledImg2.width, scaledImg2.height)
  
  const mse = calculateMSE(img1Data, img2Data)
  const psnr = calculatePSNR(mse)
  const ssim = calculateSSIM(img1Data, img2Data)
  
  let pixelDifferences = 0
  let maxDifference = 0
  
  for (let i = 0; i < img1Data.data.length; i += 4) {
    const r1 = img1Data.data[i]
    const g1 = img1Data.data[i + 1]
    const b1 = img1Data.data[i + 2]
    const r2 = img2Data.data[i]
    const g2 = img2Data.data[i + 1]
    const b2 = img2Data.data[i + 2]
    
    const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2)
    if (diff > 0) pixelDifferences++
    if (diff > maxDifference) maxDifference = diff
  }
  
  return {
    mse,
    psnr,
    ssim,
    pixelDifferences,
    maxDifference
  }
}

export const createDifferenceImage = (img1: CustomImageData, img2: CustomImageData): HTMLCanvasElement => {
  // Prepare images for comparison (downscale to smaller resolution)
  const { img1: scaledImg1, img2: scaledImg2 } = prepareImagesForComparison(img1, img2)
  
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  
  canvas.width = scaledImg1.width
  canvas.height = scaledImg1.height
  
  const img1Data = scaledImg1.context.getImageData(0, 0, scaledImg1.width, scaledImg1.height)
  const img2Data = scaledImg2.context.getImageData(0, 0, scaledImg2.width, scaledImg2.height)
  const diffData = context.createImageData(scaledImg1.width, scaledImg1.height)
  
  for (let i = 0; i < img1Data.data.length; i += 4) {
    const r1 = img1Data.data[i]
    const g1 = img1Data.data[i + 1]
    const b1 = img1Data.data[i + 2]
    const r2 = img2Data.data[i]
    const g2 = img2Data.data[i + 1]
    const b2 = img2Data.data[i + 2]
    
    const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2)
    const intensity = Math.min(255, diff * 3) // Amplify differences
    
    diffData.data[i] = intensity     // Red
    diffData.data[i + 1] = 0         // Green
    diffData.data[i + 2] = 0         // Blue
    diffData.data[i + 3] = 255       // Alpha
  }
  
  context.putImageData(diffData, 0, 0)
  return canvas
}

export { createScaledImage }

// Debounced comparison to avoid excessive calculations
let comparisonTimeout: number | null = null

export const debouncedCompareImages = (
  img1: CustomImageData, 
  img2: CustomImageData, 
  callback: (metrics: ComparisonMetrics) => void,
  delay: number = 300
): void => {
  if (comparisonTimeout) {
    clearTimeout(comparisonTimeout)
  }
  
  comparisonTimeout = window.setTimeout(() => {
    const metrics = compareImages(img1, img2)
    callback(metrics)
  }, delay)
}

// Memory management utilities
export const clearImageCache = (): void => {
  scaledImageCache.clear()
}

export const getImageCacheSize = (): number => {
  return scaledImageCache.size
}

// Utility to free up memory from large canvases
export const cleanupImageData = (imageData: CustomImageData): void => {
  if (imageData.canvas) {
    // Clear the canvas to free memory
    const ctx = imageData.canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, imageData.canvas.width, imageData.canvas.height)
    }
  }
} 