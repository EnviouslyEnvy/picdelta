# PicDelta

An advanced image comparison tool originally designed for analyzing and observing differences between upscaled images with pixel-level precision. This tool visualizes and quantifies differences between upscalers or any other types of processing in multiple metrics.

Personally, I used it to see what upscalers would work best on old photoshoots of myself that got compressed over social media.

## Features

### Visual Comparison
- **Difference visualization** highlighting individual pixel differences
- **Aligned zoom and pan** for specific area scrutiny
- WIP: **Automatic resolution handling** for images with matching aspect ratios (avoids upscaling artifacts)

### Metrics

**MSE (Mean Squared Error)**
- Lower values indicate more similar images
- 0 = identical images

**PSNR (Peak Signal-to-Noise Ratio)**
- Higher values indicate better quality/similarity
- Measured in decibels (dB)
- ∞ = identical images

**SSIM (Structural Similarity)**
- Range: -1 to 1
- 1 = identical images
- Considers luminance, contrast, and structure

- **Pixel difference count** - Number of differing pixels
- **Maximum pixel difference** - Largest single pixel variance

## Usage

1. **Upload**: Drag and drop or click to select two images to compare
2. **Analyze Differences**:
   - Use "Side by Side" mode to see both images and their difference
   - Use "Difference Only" mode to focus on the difference visualization
3. **Neat mEtrics**: Check the quantitative analysis below the images

## Technical Details

### Supported Formats
- So far: PNG, JPG/JPEG, WebP
- **Images must have the same aspect ratio** (different resolutions are handled without upscaling)
- **Images should have identical or similar resolution**

Currently, images with different resolutions may display at different visual sizes. Currently I'm working on consistent visual sizing with configurable scaling options.

### Planned Scaling Features
- **No Interpolation**: Maintain exact pixel data (current behavior)
- **Nearest Neighbor**: Sharp, pixelated scaling for precise pixel analysis
- **Bilinear/Bicubic**: High-quality smooth scaling for visual comparison
- **Consistent Visual Sizing**: Option to display different resolution images at the same visual size

## Development

Built with:
- React + TypeScript
- Vite for fast development
- Canvas API for image processing
- shadcn for components and theming

## Getting Started

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build
```bash
npm run build
npm run preview
```