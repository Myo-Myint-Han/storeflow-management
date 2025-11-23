// lib/image-utils.ts
// Image optimization utilities for StoreFlow
// Requires: npm install sharp

interface OptimizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "jpeg" | "webp" | "png";
}

/**
 * Optimize image buffer with Sharp
 * Reduces file size while maintaining quality
 */
export async function optimizeImage(
  buffer: Buffer,
  options: OptimizeOptions = {}
): Promise<Buffer> {
  // Dynamic import to avoid issues in edge runtime
  const sharp = (await import("sharp")).default;

  const {
    maxWidth = 800,
    maxHeight = 600,
    quality = 80,
    format = "webp",
  } = options;

  let pipeline = sharp(buffer)
    .resize(maxWidth, maxHeight, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .rotate(); // Auto-rotate based on EXIF data

  switch (format) {
    case "webp":
      pipeline = pipeline.webp({ quality });
      break;
    case "jpeg":
      pipeline = pipeline.jpeg({ quality, progressive: true });
      break;
    case "png":
      pipeline = pipeline.png({ quality });
      break;
  }

  return pipeline.toBuffer();
}

/**
 * Optimize product images
 * Target: ~50KB, 400x400px max
 */
export async function optimizeProductImage(buffer: Buffer): Promise<Buffer> {
  return optimizeImage(buffer, {
    maxWidth: 400,
    maxHeight: 400,
    quality: 75,
    format: "webp",
  });
}

/**
 * Optimize store logo
 * Target: ~20KB, 200x200px max
 */
export async function optimizeLogo(buffer: Buffer): Promise<Buffer> {
  return optimizeImage(buffer, {
    maxWidth: 200,
    maxHeight: 200,
    quality: 80,
    format: "webp",
  });
}

/**
 * Optimize avatar image
 * Target: ~15KB, 150x150px max
 */
export async function optimizeAvatar(buffer: Buffer): Promise<Buffer> {
  return optimizeImage(buffer, {
    maxWidth: 150,
    maxHeight: 150,
    quality: 80,
    format: "webp",
  });
}

/**
 * Generate blur placeholder for Next.js Image component
 * Returns base64 encoded tiny image
 */
export async function generateBlurPlaceholder(buffer: Buffer): Promise<string> {
  const sharp = (await import("sharp")).default;

  const tiny = await sharp(buffer)
    .resize(10, 10, { fit: "inside" })
    .blur()
    .jpeg({ quality: 50 })
    .toBuffer();

  return `data:image/jpeg;base64,${tiny.toString("base64")}`;
}

/**
 * Get image metadata
 */
export async function getImageMetadata(buffer: Buffer) {
  const sharp = (await import("sharp")).default;

  const metadata = await sharp(buffer).metadata();

  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    size: buffer.length,
    hasAlpha: metadata.hasAlpha,
  };
}

/**
 * Validate image before processing
 */
export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "Invalid file type. Please upload JPEG, PNG, WebP, or GIF images.",
    };
  }

  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: "File too large. Maximum size is 5MB.",
    };
  }

  return { valid: true };
}

/**
 * Convert File to Buffer for processing
 */
export async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generate unique filename for storage
 */
export function generateUniqueFilename(
  originalName: string,
  prefix?: string
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split(".").pop() || "webp";
  const prefixStr = prefix ? `${prefix}-` : "";

  return `${prefixStr}${timestamp}-${random}.${extension}`;
}
