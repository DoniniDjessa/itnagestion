import { supabase } from "@/lib/supabase/client";
import { compressImage } from "@/lib/compress-image";

export const STORAGE_BUCKET = "centre-bucket";

/** Extract storage object path from a public bucket URL. */
export function storagePathFromPublicUrl(url: string | null | undefined) {
  if (!url) return null;
  const marker = `/object/public/${STORAGE_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length).split("?")[0]);
}

export async function deleteStorageFile(url: string | null | undefined) {
  const path = storagePathFromPublicUrl(url);
  if (!path) return { error: null as string | null };

  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
  return { error: error?.message ?? null };
}

async function uploadCompressed(
  file: File,
  folder: "patients" | "products",
) {
  const compressed = await compressImage(file, {
    maxEdge: 1200,
    quality: 0.72,
  });

  const path = `${folder}/${crypto.randomUUID()}.jpg`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, compressed, {
      cacheControl: "3600",
      upsert: false,
      contentType: "image/jpeg",
    });

  if (error) {
    return { url: null as string | null, error: error.message };
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, error: null as string | null };
}

export async function uploadPatientPicture(file: File) {
  return uploadCompressed(file, "patients");
}

export async function uploadProductPicture(file: File) {
  return uploadCompressed(file, "products");
}

/** @deprecated use STORAGE_BUCKET */
export const PATIENT_BUCKET = STORAGE_BUCKET;
