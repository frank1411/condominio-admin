import { supabaseAdmin } from "./supabase";

const DEFAULT_BUCKET = "condominio-admin";

/**
 * Get or create a storage bucket by name.
 * Uses the Supabase admin client (service_role key).
 */
async function ensureBucket(name: string = DEFAULT_BUCKET): Promise<string> {
  if (!supabaseAdmin) throw new Error("Supabase admin client not configured");

  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === name);
  if (!exists) {
    const { error } = await supabaseAdmin.storage.createBucket(name, {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024, // 10 MB
    });
    if (error && !error.message.includes("already exists")) {
      throw new Error(`Failed to create bucket: ${error.message}`);
    }
  }
  return name;
}

/**
 * Generate a presigned URL for uploading a file.
 * The URL expires after `expiresIn` seconds (default 1 hour).
 */
export async function createPresignedUploadUrl(
  filePath: string,
  expiresIn: number = 3600,
  bucketName?: string
): Promise<{ signedUrl: string; publicUrl: string; token: string; path: string }> {
  const bucket = await ensureBucket(bucketName);

  if (!supabaseAdmin) throw new Error("Supabase admin client not configured");

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUploadUrl(filePath, {
      upsert: false,
    });

  if (error) throw new Error(`Failed to create upload URL: ${error.message}`);

  const { data: publicUrlData } = supabaseAdmin.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return {
    signedUrl: data.signedUrl,
    publicUrl: publicUrlData.publicUrl,
    token: data.token,
    path: data.path,
  };
} // ...createPresignedUploadUrl

/**
 * Generate a presigned URL for downloading a file.
 * The URL expires after `expiresIn` seconds (default 1 hour).
 */
export async function createPresignedDownloadUrl(
  filePath: string,
  expiresIn: number = 3600,
  bucketName?: string
): Promise<string | null> {
  const bucket = bucketName || DEFAULT_BUCKET;

  if (!supabaseAdmin) return null;

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(filePath, expiresIn);

  if (error) return null;
  return data.signedUrl;
}

/**
 * Delete a file from storage.
 */
export async function deleteFile(
  filePath: string,
  bucketName?: string
): Promise<void> {
  const bucket = bucketName || DEFAULT_BUCKET;

  if (!supabaseAdmin) throw new Error("Supabase admin client not configured");

  const { error } = await supabaseAdmin.storage.from(bucket).remove([filePath]);
  if (error) throw new Error(`Failed to delete file: ${error.message}`);
}
