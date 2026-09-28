// Thin wrapper around Supabase Storage calls for the 'academic-resources'
// bucket. Only ever invoked by the sync engine (batch 10) once online --
// components attach files via queueFileUpload() (Dexie) instead of calling
// this directly, so uploads work the same way whether online or offline.
import { createClient } from "@/lib/supabase/client";

export async function uploadResourceFile(storagePath: string, file: Blob) {
  const supabase = createClient();
  const { error } = await supabase.storage
    .from("academic-resources")
    .upload(storagePath, file, { upsert: true });
  if (error) throw error;
  return storagePath;
}

export async function getResourceFileUrl(storagePath: string, expiresInSeconds = 3600) {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("academic-resources")
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}
