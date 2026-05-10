import { createServiceRoleClient } from "@/lib/supabase/admin";

const BUCKET = "event-assets";

async function ensureBucket() {
  const supabase = createServiceRoleClient();
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    await supabase.storage.createBucket(BUCKET, { public: true });
  }
}

export async function uploadEventAsset(
  path: string,
  bytes: Buffer,
  contentType: string
): Promise<{ publicUrl: string } | { error: string }> {
  try {
    await ensureBucket();
    const supabase = createServiceRoleClient();
    const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType,
      upsert: true,
    });
    if (error) {
      return { error: error.message };
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { publicUrl: data.publicUrl };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return { error: message };
  }
}
