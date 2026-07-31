import { supabaseAdmin } from "./_core/supabase";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "condominio-admin";

/**
 * Returns the Supabase admin client, throwing if not initialized.
 */
function getAdminClient() {
  if (!supabaseAdmin) {
    throw new Error(
      "Supabase client not initialized. Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars."
    );
  }
  return supabaseAdmin;
}

/**
 * Returns the Supabase storage bucket name.
 */
function getBucket(): string {
  getAdminClient(); // valida que el cliente exista
  return BUCKET;
}

/**
 * Upload a file to Supabase Storage.
 *
 * @param relKey  - Storage path (e.g. "payments/123/1680000000-abc.pdf")
 * @param data    - File contents as Buffer, Uint8Array, or string
 * @param contentType - MIME type (e.g. "image/jpeg", "application/pdf")
 * @returns `{ key, url }` where `key` is the normalized path and `url` is the public URL
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const admin = getAdminClient();
  const bucket = getBucket();
  const key = normalizeKey(relKey);
  const fileData =
    typeof data === "string" ? new Blob([data], { type: contentType }) : data;

  const { error } = await admin.storage
    .from(bucket)
    .upload(key, fileData, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(
      `Storage upload failed: ${error.message} (bucket: ${bucket}, key: ${key})`
    );
  }

  const { data: publicData } = admin.storage
    .from(bucket)
    .getPublicUrl(key);

  return { key, url: publicData.publicUrl };
}

/**
 * Get the public URL of a stored file.
 *
 * @param relKey - Storage path
 * @returns `{ key, url }` with the public URL
 */
export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const admin = getAdminClient();
  const bucket = getBucket();
  const key = normalizeKey(relKey);

  const { data: publicData } = admin.storage
    .from(bucket)
    .getPublicUrl(key);

  return { key, url: publicData.publicUrl };
}

function normalizeKey(relKey: string): string {
  // Eliminar leading slashes
  let key = relKey.replace(/^\/+/, "");
  // Prevenir path traversal
  key = key.replace(/\.\.\//g, "");
  key = key.replace(/\.\.\\/g, "");
  // Eliminar null bytes y caracteres de control
  key = key.replace(/[\x00-\x1f\x7f]/g, "");
  // Eliminar caracteres peligrosos (XSS, shell)
  key = key.replace(/[<>"'&|;`$]/g, "");
  // Limitar longitud
  return key.slice(0, 512);
}
