/** Compress an image file via canvas before upload (JPEG, max edge, quality). */
export async function compressImage(
  file: File,
  options: { maxEdge?: number; quality?: number } = {},
): Promise<File> {
  const maxEdge = options.maxEdge ?? 1200;
  const quality = options.quality ?? 0.72;

  if (!file.type.startsWith("image/")) return file;

  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );

  if (!blob) return file;

  const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}
