/**
 * File uploads to Supabase Storage (invoice scans, waste photos). Public buckets with unguessable
 * object paths, so the returned URL renders directly in an <img>. No-op / null in local mode, so
 * the modules' existing simulated affordances keep working offline.
 */
import { supabase } from './supabase';

export type AttachmentBucket = 'invoice-scans' | 'waste-photos';

function extFor(file: File | Blob, fallback: string): string {
  const type = (file as File).type || '';
  if (type === 'image/png') return 'png';
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/webp') return 'webp';
  if (type === 'application/pdf') return 'pdf';
  const name = (file as File).name || '';
  const m = /\.([a-z0-9]{2,5})$/i.exec(name);
  return m ? m[1].toLowerCase() : fallback;
}

/**
 * Upload a captured photo / scanned document; returns its public URL, or null in local mode.
 * Throws with context on a real upload failure so the caller can surface a toast.
 */
export async function uploadAttachment(bucket: AttachmentBucket, file: File | Blob, fallbackExt = 'jpg'): Promise<string | null> {
  if (!supabase) return null;
  const path = `${crypto.randomUUID()}.${extFor(file, fallbackExt)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
    contentType: (file as File).type || undefined,
  });
  if (error) throw new Error(`upload to ${bucket} failed: ${error.message}`);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** True when uploads are available (cloud mode). Modules can use it to show a real vs simulated control. */
export function canUpload(): boolean {
  return supabase !== null;
}
