import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { ImageData, ViewState } from '../types'

interface ImageViewerProps {
  image: ImageData | HTMLCanvasElement
  title: string
  viewState: ViewState
  onViewStateChange: (state: ViewState) => void
  containerWidth?: number
  containerHeight?: number
  className?: string
}

export default function ImageViewer({ 
  image, 
  title, 
  viewState, 
  onViewStateChange,
  containerWidth = 400,
  containerHeight = 300,
  className
}: ImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Get source canvas
  const sourceCanvas = useMemo(() => {
    return image instanceof HTMLCanvasElement ? image : image.canvas
  }, [image])

  // Calculate scale to fit image in container
  const fitScale = useMemo(() => {
    if (!sourceCanvas.width || !sourceCanvas.height) return 1
    const scaleX = containerWidth / sourceCanvas.width
    const scaleY = containerHeight / sourceCanvas.height
    return Math.min(scaleX, scaleY, 1)
  }, [sourceCanvas.width, sourceCanvas.height, containerWidth, containerHeight])

  // Initialize canvas at full original resolution
  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !sourceCanvas.width || !sourceCanvas.height) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas to ORIGINAL resolution
    canvas.width = sourceCanvas.width
    canvas.height = sourceCanvas.height
    
    // Draw image at full resolution
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(sourceCanvas, 0, 0)
  }, [sourceCanvas])

  useEffect(() => {
    initializeCanvas()
  }, [initializeCanvas])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX - viewState.offsetX, y: e.clientY - viewState.offsetY })
  }, [viewState.offsetX, viewState.offsetY])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()
    
    const newOffsetX = e.clientX - dragStart.x
    const newOffsetY = e.clientY - dragStart.y
    
    onViewStateChange({
      ...viewState,
      offsetX: newOffsetX,
      offsetY: newOffsetY
    })
  }, [isDragging, dragStart, viewState, onViewStateChange])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Use native event listener for wheel
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.max(0.1, Math.min(50, viewState.zoom * delta))
      
      onViewStateChange({
        ...viewState,
        zoom: newZoom
      })
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    
    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [viewState, onViewStateChange])

  // Transform with translate before scale for consistent movement
  const transformStyle = useMemo(() => {
    const totalScale = fitScale * viewState.zoom
    
    return {
      transform: `translate(${viewState.offsetX}px, ${viewState.offsetY}px) scale(${totalScale})`,
      transformOrigin: 'center',
      imageRendering: viewState.zoom > 1 ? 'pixelated' as const : 'auto' as const,
      cursor: isDragging ? 'grabbing' : 'grab',
      position: 'absolute' as const,
      left: '50%',
      top: '50%',
      marginLeft: `-${sourceCanvas.width / 2}px`,
      marginTop: `-${sourceCanvas.height / 2}px`
    }
  }, [viewState.offsetX, viewState.offsetY, viewState.zoom, fitScale, isDragging, sourceCanvas.width, sourceCanvas.height])

  // Calculate effective zoom for display
  const effectiveZoom = fitScale * viewState.zoom

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <h3 className="text-lg font-semibold text-foreground text-center m-0">{title}</h3>
      <div 
        ref={containerRef}
        className="relative overflow-hidden rounded border border-border bg-muted/30 shadow-sm"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ 
          width: `${containerWidth}px`,
          height: `${containerHeight}px`
        }}
      >
        <canvas 
          ref={canvasRef} 
          className={cn(
            "transition-none",
            !isDragging && "transition-transform duration-100 ease-out"
          )}
          style={transformStyle}
        />
      </div>
      <div className="text-center text-xs text-muted-foreground mt-1">
        Original: {sourceCanvas.width} × {sourceCanvas.height} | 
        Fit: {Math.round(fitScale * 100)}% | 
        Zoom: {Math.round(viewState.zoom * 100)}% | 
        Effective: {Math.round(effectiveZoom * 100)}%
      </div>
    </div>
  )
} 