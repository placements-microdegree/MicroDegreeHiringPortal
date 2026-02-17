const path = require("node:path");
const { v4: uuidv4 } = require("uuid");
const { getSupabaseAdmin, getSupabaseUser, isServiceRoleConfigured } = require("../config/db");

const BUCKET = "resumes"; // reuse existing bucket; stores under avatars/ prefix

function buildObjectPath(userId, originalName) {
  const ext = path.extname(originalName || "") || ".jpg";
  return `avatars/${userId}/${uuidv4()}${ext}`;
}

async function uploadProfilePhoto({ userId, file, jwt }) {
  const supabaseAdmin = getSupabaseAdmin();
  const storageClient = supabaseAdmin;

  if (!storageClient || !isServiceRoleConfigured) {
    const err = new Error(
      "SUPABASE_SERVICE_ROLE_KEY required to upload profile photos (for storage write)",
    );
    err.status = 500;
    throw err;
  }

  const objectPath = buildObjectPath(userId, file.originalname);

  const { error } = await storageClient.storage
    .from(BUCKET)
    .upload(objectPath, file.buffer, {
      contentType: file.mimetype || "image/jpeg",
      upsert: true,
    });
  if (error) throw error;

  const { data } = storageClient.storage.from(BUCKET).getPublicUrl(objectPath);
  const publicUrl = data.publicUrl;

  // Also insert/update a DB record if desired; for now just return URL.
  return { publicUrl, storagePath: objectPath };
}

module.exports = {
  uploadProfilePhoto,
};
