// FILE: controllers/applicationController.js

const applicationService = require("../services/applicationService");
const resumeService      = require("../services/resumeService"); // ← added
const { getSupabaseAdmin, getSupabaseUser } = require("../config/db");
const { ROLES } = require("../utils/constants");

async function apply(req, res, next) {
  try {
    const application = await applicationService.createApplication({
      jwt: req.user.jwt,
      payload: {
        studentId: req.user.id,
        ...req.body,
        jobId:  req.body.jobId,
        status: "Applied",
      },
    });
    res.status(201).json({ success: true, application });
  } catch (err) { next(err); }
}

async function myApplications(req, res, next) {
  try {
    const applications = await applicationService.listApplicationsByStudent({
      studentId: req.user.id,
      jwt:       req.user.jwt,
    });
    res.json({ success: true, applications });
  } catch (err) { next(err); }
}

async function myAnalytics(req, res, next) {
  try {
    const analytics = await applicationService.getStudentAnalytics({
      studentId: req.user.id,
      jwt:       req.user.jwt,
    });
    res.json({ success: true, analytics });
  } catch (err) { next(err); }
}

async function allApplications(req, res, next) {
  try {
    const applications = await applicationService.listAllApplications({
      actor: req.user,
      jwt:   req.user.jwt,
    });
    res.json({ success: true, applications });
  } catch (err) { next(err); }
}

async function updateStatus(req, res, next) {
  try {
    const updated = await applicationService.updateApplicationStatus({
      applicationId: req.params.id,
      status:        req.body.status,
      actor:         req.user,
      jwt:           req.user.jwt,
    });
    res.json({ success: true, application: updated });
  } catch (err) { next(err); }
}

async function updateComment(req, res, next) {
  try {
    const updated = await applicationService.updateApplicationComment({
      applicationId: req.params.id,
      comment:       req.body.comment,
      jwt:           req.user.jwt,
    });
    res.json({ success: true, application: updated });
  } catch (err) { next(err); }
}

async function applyOnBehalf(req, res, next) {
  try {
    const application = await applicationService.applyOnBehalf({
      jwt:     req.user.jwt,
      payload: req.body,
    });
    res.status(201).json({ success: true, application });
  } catch (err) { next(err); }
}

// Search students by name / email / phone
async function searchStudents(req, res, next) {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.json({ success: true, students: [] });

    const supabase = getSupabaseAdmin() || getSupabaseUser(req.user.jwt);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, profile_photo_url")
      .eq("role", ROLES.STUDENT)
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
      .order("full_name", { ascending: true })
      .limit(20);

    if (error) throw error;
    return res.json({ success: true, students: data || [] });
  } catch (err) { next(err); }
}

// Fetch a single student's profile for HR pre-fill
async function getStudentProfile(req, res, next) {
  try {
    const { studentId } = req.params;
    if (!studentId) {
      return res.status(400).json({ success: false, message: "studentId is required" });
    }
    const supabase = getSupabaseAdmin() || getSupabaseUser(req.user.jwt);
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, phone, location, total_experience, current_ctc, expected_ctc, is_currently_working, experience_years",
      )
      .eq("id", studentId)
      .maybeSingle();
    if (error) throw error;
    return res.json({ success: true, profile: data || null });
  } catch (err) { next(err); }
}

// Fetch a student's resumes with fresh signed URLs.
// Uses resumeService.listResumesByUserWithSignedUrls — the same path that
// students use for their own resumes — so signed URLs are always fresh and
// the correct storage bucket / path is used automatically.
async function getStudentResumes(req, res, next) {
  try {
    const { studentId } = req.params;
    if (!studentId) {
      return res.status(400).json({ success: false, message: "studentId is required" });
    }

    const resumes = await resumeService.listResumesByUserWithSignedUrls({
      userId: studentId,
      jwt:    req.user.jwt,
    });

    return res.json({ success: true, resumes: resumes || [] });
  } catch (err) { next(err); }
}

module.exports = {
  apply,
  myApplications,
  myAnalytics,
  allApplications,
  updateStatus,
  updateComment,
  applyOnBehalf,
  searchStudents,
  getStudentProfile,
  getStudentResumes,
};