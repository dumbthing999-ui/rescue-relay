// Rescue Relay — Client-side image compression
// Compress a donation photo in-browser (canvas) before upload so the vision
// call stays small and fast. No native deps (no sharp) — pure browser canvas.

const MAX_EDGE = 1024;
const JPEG_QUALITY = 0.8;
const MAX_RAW_BYTES = 5 * 1024 * 1024; // 5 MB before compression

export interface CompressedImage {
  base64: string; // data URL (jpeg)
  bytes: number;
}

export async function compressImage(file: File): Promise<CompressedImage> {
  if (file.size > MAX_RAW_BYTES) {
    throw new Error("Image too large — choose a file under 5 MB.");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas not available in this browser.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  // Approximate decoded byte size from the base64 length.
  const bytes = Math.round((dataUrl.length - "data:image/jpeg;base64,".length) * 0.75);

  return { base64: dataUrl, bytes };
}
