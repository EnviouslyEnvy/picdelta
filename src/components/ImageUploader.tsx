import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { loadImageToCanvas } from '../utils/imageUtils'
import type { ImageData } from '../types'

interface ImageUploaderProps {
  onImagesLoaded: (img1: ImageData, img2: ImageData) => void
  onError: (error: string) => void
}

export default function ImageUploader({ onImagesLoaded, onError }: ImageUploaderProps) {
  const [image1, setImage1] = useState<ImageData | null>(null)
  const [image2, setImage2] = useState<ImageData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleFileSelect = useCallback(async (file: File, isFirstImage: boolean) => {
    try {
      setIsLoading(true)
      const imageData = await loadImageToCanvas(file)
      
      if (isFirstImage) {
        setImage1(imageData)
        if (image2) {
          onImagesLoaded(imageData, image2)
        }
      } else {
        setImage2(imageData)
        if (image1) {
          onImagesLoaded(image1, imageData)
        }
      }
    } catch (error) {
      onError(`Failed to load image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }, [image1, image2, onImagesLoaded, onError])

  const handleDrop = useCallback((e: React.DragEvent, isFirstImage: boolean) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    const imageFile = files.find(file => file.type.startsWith('image/'))
    
    if (imageFile) {
      handleFileSelect(imageFile, isFirstImage)
    }
  }, [handleFileSelect])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, isFirstImage: boolean) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file, isFirstImage)
    }
  }, [handleFileSelect])

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Upload Images to Compare</CardTitle>
        <CardDescription>Select two upscaled images to analyze their differences</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all hover:border-primary hover:bg-accent relative ${image1 ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-muted-foreground/25'}`}
            onDrop={(e) => handleDrop(e, true)}
            onDragOver={(e) => e.preventDefault()}
          >
            <input 
              type="file"
              accept="image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => handleFileChange(e, true)}
            />
            <div className="text-sm text-muted-foreground">
              {image1 ? (
                <>
                  <div className="font-medium text-foreground">{image1.file.name}</div>
                  <div className="mt-1">{image1.width} × {image1.height}</div>
                </>
              ) : (
                <>
                  Drop the first image here or click to select
                  <br />
                  <span className="text-xs">PNG, JPG, WEBP supported</span>
                </>
              )}
            </div>
          </div>

          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all hover:border-primary hover:bg-accent relative ${image2 ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-muted-foreground/25'}`}
            onDrop={(e) => handleDrop(e, false)}
            onDragOver={(e) => e.preventDefault()}
          >
            <input 
              type="file"
              accept="image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => handleFileChange(e, false)}
            />
            <div className="text-sm text-muted-foreground">
              {image2 ? (
                <>
                  <div className="font-medium text-foreground">{image2.file.name}</div>
                  <div className="mt-1">{image2.width} × {image2.height}</div>
                </>
              ) : (
                <>
                  Drop the second image here or click to select
                  <br />
                  <span className="text-xs">PNG, JPG, WEBP supported</span>
                </>
              )}
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center mt-4 text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
            Loading images...
          </div>
        )}
      </CardContent>
    </Card>
  )
}