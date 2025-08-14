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
  isPanning?: boolean
  onPanningChange?: (isPanning: boolean) => void
}

export default function ImageViewer({ 
  image, 
  title, 
  viewState, 
  onViewStateChange,
  containerWidth = 400,
  containerHeight = 300,
  className,
  isPanning,
  onPanningChange
}: ImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const lastMouseRef = useRef<{ x: number, y: number } | null>(null)

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
    lastMouseRef.current = { x: e.clientX, y: e.clientY }
    onPanningChange?.(true)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()

    const last = lastMouseRef.current
    if (!last) {
      lastMouseRef.current = { x: e.clientX, y: e.clientY }
      return
    }

    const dx = e.clientX - last.x
    const dy = e.clientY - last.y
    lastMouseRef.current = { x: e.clientX, y: e.clientY }

    const totalScale = fitScale * viewState.zoom
    const imgW = sourceCanvas.width
    const imgH = sourceCanvas.height

    const deltaCenterX = -dx / (totalScale * imgW)
    const deltaCenterY = -dy / (totalScale * imgH)

    onViewStateChange({
      ...viewState,
      centerX: Math.min(1, Math.max(0, viewState.centerX + deltaCenterX)),
      centerY: Math.min(1, Math.max(0, viewState.centerY + deltaCenterY))
    })
  }, [isDragging, fitScale, viewState, onViewStateChange, sourceCanvas.width, sourceCanvas.height])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    lastMouseRef.current = null
    onPanningChange?.(false)
  }, [])

  // Use native event listener for wheel
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.max(0.1, Math.min(50, viewState.zoom * delta))

      // Zoom around cursor position to keep point under cursor stable
      const rect = container.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const containerCenterX = containerWidth / 2
      const containerCenterY = containerHeight / 2

      const oldScale = fitScale * viewState.zoom
      const newScale = fitScale * newZoom

      const rx = mouseX - containerCenterX
      const ry = mouseY - containerCenterY

      const imgW = sourceCanvas.width
      const imgH = sourceCanvas.height

      const newCenterX = viewState.centerX + rx * (1 / oldScale - 1 / newScale) / imgW
      const newCenterY = viewState.centerY + ry * (1 / oldScale - 1 / newScale) / imgH

      onViewStateChange({
        ...viewState,
        zoom: newZoom,
        centerX: Math.min(1, Math.max(0, newCenterX)),
        centerY: Math.min(1, Math.max(0, newCenterY))
      })
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    
    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [viewState, onViewStateChange, fitScale, containerWidth, containerHeight, sourceCanvas.width, sourceCanvas.height])

  // Transform with translate before scale for consistent movement
  const transformStyle = useMemo(() => {
    const totalScale = fitScale * viewState.zoom

    const imgW = sourceCanvas.width
    const imgH = sourceCanvas.height
    const vx = (viewState.centerX * imgW) - (imgW / 2)
    const vy = (viewState.centerY * imgH) - (imgH / 2)

    const translateX = -vx * totalScale
    const translateY = -vy * totalScale

    return {
      transform: `translate(${translateX}px, ${translateY}px) scale(${totalScale})`,
      transformOrigin: 'center',
      imageRendering: viewState.zoom > 1 ? 'pixelated' as const : 'auto' as const,
      cursor: isDragging ? 'grabbing' : 'grab',
      position: 'absolute' as const,
      left: '50%',
      top: '50%',
      marginLeft: `-${sourceCanvas.width / 2}px`,
      marginTop: `-${sourceCanvas.height / 2}px`
    }
  }, [viewState.centerX, viewState.centerY, viewState.zoom, fitScale, isDragging, sourceCanvas.width, sourceCanvas.height])

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
            !(isPanning ?? isDragging) && "transition-transform duration-100 ease-out"
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