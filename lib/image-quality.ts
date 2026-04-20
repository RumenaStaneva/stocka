export interface QualityResult {
  passed: boolean;
  issues: QualityIssue[];
  scores: {
    blur: number;
    brightness: number;
    width: number;
    height: number;
  };
}

export interface QualityIssue {
  type: "blurry" | "too_dark" | "too_bright" | "low_resolution";
  message: string;
}

const BLUR_THRESHOLD = 15;
const MIN_BRIGHTNESS = 40;
const MAX_BRIGHTNESS = 240;
const MIN_RESOLUTION = 500;

/**
 * Analyze image quality by checking blur, brightness, and resolution.
 * Uses a Laplacian-based edge detection for blur and average luminance for brightness.
 */
export async function checkImageQuality(file: File): Promise<QualityResult> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  // Scale down for faster analysis (max 512px on longest side)
  const scale = Math.min(1, 512 / Math.max(width, height));
  const sw = Math.round(width * scale);
  const sh = Math.round(height * scale);

  const canvas = new OffscreenCanvas(sw, sh);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, sw, sh);
  bitmap.close();

  const imageData = ctx.getImageData(0, 0, sw, sh);
  const { data } = imageData;

  // Convert to grayscale
  const gray = new Float32Array(sw * sh);
  let brightnessSum = 0;
  for (let i = 0; i < gray.length; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[i] = lum;
    brightnessSum += lum;
  }

  const avgBrightness = brightnessSum / gray.length;

  // Laplacian variance for blur detection
  // Higher variance = sharper image, lower = blurrier
  let laplacianSum = 0;
  let laplacianCount = 0;
  for (let y = 1; y < sh - 1; y++) {
    for (let x = 1; x < sw - 1; x++) {
      const idx = y * sw + x;
      const lap =
        gray[idx - sw] +
        gray[idx + sw] +
        gray[idx - 1] +
        gray[idx + 1] -
        4 * gray[idx];
      laplacianSum += lap * lap;
      laplacianCount++;
    }
  }
  const blurScore = Math.sqrt(laplacianSum / laplacianCount);

  const issues: QualityIssue[] = [];

  if (blurScore < BLUR_THRESHOLD) {
    issues.push({
      type: "blurry",
      message: "Снимката изглежда размазана. Опитайте да държите устройството неподвижно.",
    });
  }

  if (avgBrightness < MIN_BRIGHTNESS) {
    issues.push({
      type: "too_dark",
      message: "Снимката е твърде тъмна. Осигурете по-добро осветление.",
    });
  }

  if (avgBrightness > MAX_BRIGHTNESS) {
    issues.push({
      type: "too_bright",
      message: "Снимката е твърде светла. Избягвайте пряка светлина върху документа.",
    });
  }

  if (width < MIN_RESOLUTION && height < MIN_RESOLUTION) {
    issues.push({
      type: "low_resolution",
      message: "Резолюцията е твърде ниска. Снимайте по-отблизо или използвайте по-висока резолюция.",
    });
  }

  return {
    passed: issues.length === 0,
    issues,
    scores: {
      blur: blurScore,
      brightness: avgBrightness,
      width,
      height,
    },
  };
}
