const path = require("node:path");
const { v4: uuidv4 } = require("uuid");
const {
  getSupabaseUser,
  isServiceRoleConfigured,
  getSupabaseAdmin,
} = require("../config/db");

const BUCKET = "resumes";
const MAX_RESUMES_PER_STUDENT = 3;

const PDF_MIME_TYPES = new Set(["application/pdf", "application/x-pdf"]);

function isPdfFile(file) {
  const ext = path.extname(file?.originalname || "").toLowerCase();
  const mime = String(file?.mimetype || "").toLowerCase();
  return ext === ".pdf" && (mime === "" || PDF_MIME_TYPES.has(mime));
}

function buildObjectPath(userId, originalName) {
  const ext = path.extname(originalName || "");
  const name = uuidv4() + ext;
  return `${userId}/${name}`;
}

async function markResumeAsActive({ userId, resumeId, jwt }) {
  if (!resumeId) return;

  const payload = {
    active_resume_id: resumeId,
    updated_at: new Date().toISOString(),
  };

  const supabaseAdmin = getSupabaseAdmin();
  const primaryClient = supabaseAdmin || getSupabaseUser(jwt);

  const { error } = await primaryClient
    .from("profiles")
    .update(payload)
    .eq("id", userId);

  if (!error) return;
  if (!supabaseAdmin) throw error;

  const fallbackClient = getSupabaseUser(jwt);
  const { error: fallbackError } = await fallbackClient
    .from("profiles")
    .update(payload)
    .eq("id", userId);

  if (fallbackError) throw fallbackError;
}

async function uploadResume({ userId, jwt, file }) {
  if (!isPdfFile(file)) {
    const err = new Error("Only PDF resumes are allowed");
    err.status = 400;
    throw err;
  }

  const existing = await listResumesByUser(userId);
  if ((existing || []).length >= MAX_RESUMES_PER_STUDENT) {
    const err = new Error("Maximum 3 resumes are allowed");
    err.status = 400;
    throw err;
  }

  const objectPath = buildObjectPath(userId, file.originalname);

  const supabaseAdmin = getSupabaseAdmin();

  const storageClient = isServiceRoleConfigured ? supabaseAdmin : null;
  if (!storageClient) {
    const err = new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for resume upload unless you configure Storage RLS policies for user JWT uploads.",
    );
    err.status = 500;
    throw err;
  }

  const { error } = await storageClient.storage
    .from(BUCKET)
    .upload(objectPath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });
  if (error) throw error;

  const { data } = storageClient.storage.from(BUCKET).getPublicUrl(objectPath);
  const publicUrl = data.publicUrl;

  const insertPayload = {
    user_id: userId,
    file_name: file.originalname,
    file_url: publicUrl,
    storage_path: objectPath,
  };

  // Prefer user-scoped insert so RLS policies can apply.
  const supabase = getSupabaseUser(jwt);
  const { data: row, error: dbError } = await supabase
    .from("resumes")
    .insert(insertPayload)
    .select("*")
    .single();

  if (!dbError) {
    await markResumeAsActive({
      userId,
      resumeId: row?.id,
      jwt,
    });
    return row;
  }

  // Fallback to service role insert (useful while RLS is not configured).
  const { data: fallbackRow, error: fallbackErr } = await storageClient
    .from("resumes")
    .insert(insertPayload)
    .select("*")
    .single();
  if (fallbackErr) throw fallbackErr;
  await markResumeAsActive({
    userId,
    resumeId: fallbackRow?.id,
    jwt,
  });
  return fallbackRow;
}

async function listResumesByUser(userId) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    const err = new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for this operation",
    );
    err.status = 500;
    throw err;
  }

  const { data, error } = await supabaseAdmin
    .from("resumes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

async function listResumesByUserWithSignedUrls({
  userId,
  jwt,
  expiresIn = 60 * 60,
}) {
  // Prefer service role for reads to bypass RLS recursion issues.
  const supabaseAdmin = getSupabaseAdmin();
  const reader = supabaseAdmin || getSupabaseUser(jwt);

  const { data, error } = await reader
    .from("resumes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!data || data.length === 0) return [];

  if (!supabaseAdmin) return data;

  const enriched = [];
  for (const r of data) {
    // eslint-disable-next-line no-await-in-loop
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(r.storage_path, expiresIn);
    enriched.push({ ...r, signed_url: signErr ? null : signed.signedUrl });
  }
  return enriched;
}

async function isResumeReferencedByApplications({ supabaseAdmin, resumeUrl }) {
  const normalizedUrl = String(resumeUrl || "").trim();
  if (!normalizedUrl) return false;

  const { data, error } = await supabaseAdmin
    .from("applications")
    .select("id")
    .eq("selected_resume_url", normalizedUrl)
    .limit(1);

  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
}

async function deleteResume({ resumeId }) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin || !isServiceRoleConfigured) {
    const err = new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for deleting resumes",
    );
    err.status = 500;
    throw err;
  }

  // Fetch row to know storage path
  const { data: row, error: fetchErr } = await supabaseAdmin
    .from("resumes")
    .select("*")
    .eq("id", resumeId)
    .single();
  if (fetchErr) throw fetchErr;
  if (!row) return true;

  const resumeUsedByAnyApplication = await isResumeReferencedByApplications({
    supabaseAdmin,
    resumeUrl: row.file_url,
  });

  // Keep storage object if the resume URL is already used in any application.
  // This preserves historical resume links for HR/admin views.
  if (row.storage_path && !resumeUsedByAnyApplication) {
    const { error: storageDeleteErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .remove([row.storage_path]);
    if (storageDeleteErr) throw storageDeleteErr;
  }

  const { error: delErr } = await supabaseAdmin
    .from("resumes")
    .delete()
    .eq("id", resumeId);
  if (delErr) throw delErr;
  return true;
}

module.exports = {
  MAX_RESUMES_PER_STUDENT,
  uploadResume,
  listResumesByUser,
  listResumesByUserWithSignedUrls,
  deleteResume,
};
