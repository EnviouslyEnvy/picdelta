export interface ImageData {
  file: File
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
  width: number
  height: number
}

export interface ComparisonMetrics {
  mse: number
  psnr: number
  ssim: number
  pixelDifferences: number
  maxDifference: number
}

export interface ViewState {
  zoom: number
  centerX: number
  centerY: number
}

export type ComparisonMode = 'sideBySide' | 'difference' | 'overlay' 