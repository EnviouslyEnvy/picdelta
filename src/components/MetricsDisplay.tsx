import type { ComparisonMetrics } from '../types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Info } from 'lucide-react'

interface MetricsDisplayProps {
  metrics: ComparisonMetrics
}

const formatNumber = (value: number, precision = 2): string => {
  if (value === Infinity) return '∞'
  return value.toFixed(precision)
}

const metricExplanations = {
  mse: "Mean Squared Error measures the average squared difference between pixel values. Lower values (closer to 0) indicate more similar images. 0 means identical images.",
  psnr: "Peak Signal-to-Noise Ratio measures image quality in decibels. Higher values indicate better similarity. Typical values: >40dB = very similar, 30-40dB = good similarity, <30dB = noticeable differences. ∞ means identical images.",
  ssim: "Structural Similarity Index measures perceptual differences considering luminance, contrast, and structure. Range: -1 to 1, where 1 means identical images. Values >0.9 indicate very similar images.",
  pixelDifferences: "Number of pixels that differ between the two images. This counts any pixel with RGB values that don't match exactly.",
  maxDifference: "The largest single pixel difference found (sum of R, G, B differences). Range: 0-765 (0 = identical, 765 = maximum possible difference like black vs white)."
}

interface MetricCardProps {
  title: string
  value: string
  explanation: string
}

function MetricCard({ title, value, explanation }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {title}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>{explanation}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

export default function MetricsDisplay({ metrics }: MetricsDisplayProps) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Image Comparison Metrics</CardTitle>
        <CardDescription>Statistical analysis of the differences between the two images</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <MetricCard
            title="Mean Squared Error"
            value={formatNumber(metrics.mse)}
            explanation={metricExplanations.mse}
          />
          
          <MetricCard
            title="Peak Signal-to-Noise Ratio"
            value={`${formatNumber(metrics.psnr)} dB`}
            explanation={metricExplanations.psnr}
          />
          
          <MetricCard
            title="Structural Similarity"
            value={formatNumber(metrics.ssim, 4)}
            explanation={metricExplanations.ssim}
          />
          
          <MetricCard
            title="Different Pixels"
            value={metrics.pixelDifferences.toLocaleString()}
            explanation={metricExplanations.pixelDifferences}
          />
          
          <MetricCard
            title="Max Pixel Difference"
            value={metrics.maxDifference.toString()}
            explanation={metricExplanations.maxDifference}
          />
        </div>
      </CardContent>
    </Card>
  )
} 