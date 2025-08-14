import { useState, useCallback, useMemo, useEffect } from 'react'
import ImageUploader from './components/ImageUploader'
import ImageViewer from './components/ImageViewer'
import MetricsDisplay from './components/MetricsDisplay'
import { ModeToggle } from './components/mode-toggle'
import { Button } from './components/ui/button'
import { Checkbox } from './components/ui/checkbox'
import { Card, CardContent } from './components/ui/card'
import { Alert, AlertDescription } from './components/ui/alert'
import { debouncedCompareImages, createDifferenceImage } from './utils/imageUtils'
import type { ImageData, ComparisonMetrics, ViewState, ComparisonMode } from './types'

export default function App() {
  const [image1, setImage1] = useState<ImageData | null>(null)
  const [image2, setImage2] = useState<ImageData | null>(null)
  const [metrics, setMetrics] = useState<ComparisonMetrics | null>(null)
  const [differenceImage, setDifferenceImage] = useState<HTMLCanvasElement | null>(null)
  const [error, setError] = useState<string>('')
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('sideBySide')
  const [showDifference, setShowDifference] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [viewState, setViewState] = useState<ViewState>({
    zoom: 1,
    centerX: 0.5,
    centerY: 0.5
  })
  const [isPanning, setIsPanning] = useState(false)

  // Container sizing
  const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  
  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  // Container sizing calculations
  const availableWidth = Math.max(viewportWidth - 80, 600) // Min 600px total, leave margins
  
  const containerWidth = showDifference 
    ? Math.min(Math.floor((availableWidth - 60) / 2), 550) // 2 images + gaps, max 550px each
    : Math.min(Math.floor((availableWidth - 40) / 2), 600) // 2 images + gap, max 600px each
  const containerHeight = showDifference ? 400 : 500
  
  // Difference image sizing
  const differenceWidth = containerWidth
  const differenceHeight = containerHeight

  const handleImagesLoaded = useCallback((img1: ImageData, img2: ImageData) => {
    try {
      setImage1(img1)
      setImage2(img2)
      setIsProcessing(true)
      
      // Reset view state when new images are loaded
      setViewState({ zoom: 1, centerX: 0.5, centerY: 0.5 })
      
      // Use debounced comparison for better performance
      debouncedCompareImages(img1, img2, (comparisonMetrics) => {
        setMetrics(comparisonMetrics)
        setIsProcessing(false)
      })
      
      // Create difference image (this is fast so no need to debounce)
      const diffImage = createDifferenceImage(img1, img2)
      setDifferenceImage(diffImage)
      
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare images')
      setIsProcessing(false)
    }
  }, [])

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage)
  }, [])

  const handleZoomIn = useCallback(() => {
    setViewState(prev => ({ ...prev, zoom: Math.min(50, prev.zoom * 1.2) }))
  }, [])

  const handleZoomOut = useCallback(() => {
    setViewState(prev => ({ ...prev, zoom: Math.max(0.1, prev.zoom / 1.2) }))
  }, [])

  const handleResetView = useCallback(() => {
    setViewState({ zoom: 1, centerX: 0.5, centerY: 0.5 })
  }, [])

  const hasImages = image1 && image2

  const renderImageComparison = useMemo(() => {
    if (!hasImages) return null

    switch (comparisonMode) {
      case 'sideBySide':
        return (
          <div className="image-comparison-layout">
            <div className="main-images">
              <ImageViewer
                image={image1}
                title="Image 1"
                viewState={viewState}
                onViewStateChange={setViewState}
                containerWidth={containerWidth}
                containerHeight={containerHeight}
                isPanning={isPanning}
                onPanningChange={setIsPanning}
              />
              <ImageViewer
                image={image2}
                title="Image 2"
                viewState={viewState}
                onViewStateChange={setViewState}
                containerWidth={containerWidth}
                containerHeight={containerHeight}
                isPanning={isPanning}
                onPanningChange={setIsPanning}
              />
            </div>
            {showDifference && differenceImage && (
              <div className="difference-section">
                <ImageViewer
                  image={differenceImage}
                  title="Difference"
                  viewState={viewState}
                  onViewStateChange={setViewState}
                  containerWidth={differenceWidth}
                  containerHeight={differenceHeight}
                  isPanning={isPanning}
                  onPanningChange={setIsPanning}
                />
              </div>
            )}
          </div>
        )
      case 'difference':
        return differenceImage ? (
          <div className="image-comparison-layout">
            <ImageViewer
              image={differenceImage}
              title="Difference Visualization"
              viewState={viewState}
              onViewStateChange={setViewState}
              containerWidth={showDifference ? differenceWidth : containerWidth * 2}
              containerHeight={containerHeight}
            />
          </div>
        ) : null
      default:
        return null
    }
  }, [comparisonMode, hasImages, image1, image2, differenceImage, viewState, showDifference, containerWidth, containerHeight, differenceWidth, differenceHeight])

  return (
    <div className="container max-w-7xl mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-foreground">PicDelta</h1>
          <p className="text-lg text-muted-foreground mt-2">Pixel-level image comparison and analysis tool</p>
        </div>
        <ModeToggle />
      </div>

      <ImageUploader 
        onImagesLoaded={handleImagesLoaded}
        onError={handleError}
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isProcessing && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              <span>Processing images...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {hasImages && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant={comparisonMode === 'sideBySide' ? 'default' : 'secondary'}
                  onClick={() => setComparisonMode('sideBySide')}
                >
                  Side by Side
                </Button>
                <Button
                  variant={comparisonMode === 'difference' ? 'default' : 'secondary'}
                  onClick={() => setComparisonMode('difference')}
                >
                  Difference Only
                </Button>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="show-difference"
                    checked={showDifference}
                    onCheckedChange={(checked) => setShowDifference(checked === true)}
                  />
                  <label 
                    htmlFor="show-difference"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Show Difference View
                  </label>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleZoomOut}>
                  Zoom Out
                </Button>
                <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                  {Math.round(viewState.zoom * 100)}%
                </span>
                <Button variant="outline" onClick={handleZoomIn}>
                  Zoom In
                </Button>
                <Button variant="secondary" onClick={handleResetView}>
                  Reset
                </Button>
              </div>
            </div>

            {renderImageComparison}
          </CardContent>
        </Card>
      )}

      {metrics && <MetricsDisplay metrics={metrics} />}
    </div>
  )
} 