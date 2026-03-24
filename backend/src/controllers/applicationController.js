// FILE: controllers/applicationController.js

const applicationService = require("../services/applicationService");
const resumeService = require("../services/resumeService");
const { getSupabaseAdmin, getSupabaseUser } = require("../config/db");
const { ROLES } = require("../utils/constants");

async function apply(req, res, next) {
  try {
    const application = await applicationService.createApplication({
      jwt: req.user.jwt,
      payload: {
        studentId: req.user.id,
        ...req.body,
        jobId: req.body.jobId,
        status: "Applied",
      },
    });
    res.status(201).json({ success: true, application });
  } catch (err) {
    next(err);
  }
}

async function myApplications(req, res, next) {
  try {
    const applications = await applicationService.listApplicationsByStudent({
      studentId: req.user.id,
      jwt: req.user.jwt,
    });
    res.json({ success: true, applications });
  } catch (err) {
    next(err);
  }
}

async function myAnalytics(req, res, next) {
  try {
    const analytics = await applicationService.getStudentAnalytics({
      studentId: req.user.id,
      jwt: req.user.jwt,
    });
    res.json({ success: true, analytics });
  } catch (err) {
    next(err);
  }
}

async function myCareerProgressBoard(req, res, next) {
  try {
    const progress = await applicationService.listCareerProgressBoard({
      studentId: req.user.id,
      jwt: req.user.jwt,
    });
    res.json({ success: true, progress });
  } catch (err) {
    next(err);
  }
}

async function allApplications(req, res, next) {
  try {
    const applications = await applicationService.listAllApplications({
      actor: req.user,
      jwt: req.user.jwt,
    });
    res.json({ success: true, applications });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const updated = await applicationService.updateApplicationStatus({
      applicationId: req.params.id,
      status: req.body.status,
      stage: req.body.stage,
      subStage: req.body.subStage,
      actor: req.user,
      jwt: req.user.jwt,
    });
    res.json({ success: true, application: updated });
  } catch (err) {
    next(err);
  }
}

async function updateComment(req, res, next) {
  try {
    const updated = await applicationService.updateApplicationComment({
      applicationId: req.params.id,
      comment: req.body.comment,
      comment2: req.body.comment2,
      aiSuggestionId: req.body.aiSuggestionId,
      aiApproved: req.body.aiApproved,
      actorId: req.user.id,
      jwt: req.user.jwt,
    });
    res.json({ success: true, application: updated });
  } catch (err) {
    next(err);
  }
}

async function generateAiCommentSuggestion(req, res, next) {
  try {
    const suggestion = await applicationService.generateAiCommentSuggestion({
      applicationId: req.params.id,
      regenerate: req.body?.regenerate === true,
      actorId: req.user.id,
      jwt: req.user.jwt,
    });
    res.json({ success: true, suggestion });
  } catch (err) {
    next(err);
  }
}

async function deleteOne(req, res, next) {
  try {
    await applicationService.deleteApplication({
      applicationId: req.params.id,
      jwt: req.user.jwt,
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function applyOnBehalf(req, res, next) {
  try {
    const application = await applicationService.applyOnBehalf({
      jwt: req.user.jwt,
      payload: req.body,
    });
    res.status(201).json({ success: true, application });
  } catch (err) {
    next(err);
  }
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
  } catch (err) {
    next(err);
  }
}

// NEW — fetch a single student's profile for HR pre-fill
async function getStudentProfile(req, res, next) {
  try {
    const { studentId } = req.params;
    if (!studentId) {
      return res
        .status(400)
        .json({ success: false, message: "studentId is required" });
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
  } catch (err) {
    next(err);
  }
}

// NEW — fetch a single student's resumes for HR resume selector
async function getStudentResumes(req, res, next) {
  try {
    const { studentId } = req.params;
    if (!studentId) {
      return res
        .status(400)
        .json({ success: false, message: "studentId is required" });
    }
    // Use resumeService so signed URLs are generated fresh — signed_url is NOT a DB column
    const resumes = await resumeService.listResumesByUserWithSignedUrls({
      userId: studentId,
      jwt: req.user.jwt,
    });
    return res.json({ success: true, resumes: resumes || [] });
  } catch (err) {
    next(err);
  }
}

// HR uploads a resume on behalf of a student — saved to that student's profile in DB + storage
async function uploadResumeForStudent(req, res, next) {
  try {
    const { studentId } = req.params;
    if (!studentId) {
      return res
        .status(400)
        .json({ success: false, message: "studentId is required" });
    }
    const files = req.files || [];
    if (files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No files uploaded" });
    }

    const existing = await resumeService.listResumesByUser(studentId);
    if (
      (existing.length || 0) + files.length >
      resumeService.MAX_RESUMES_PER_STUDENT
    ) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${resumeService.MAX_RESUMES_PER_STUDENT} resumes are allowed`,
      });
    }

    for (const f of files) {
      // eslint-disable-next-line no-await-in-loop
      await resumeService.uploadResume({
        userId: studentId,
        jwt: req.user.jwt, // service-role fallback handles the DB insert
        file: f,
      });
    }

    // Return full list with fresh signed URLs so frontend can update immediately
    const resumes = await resumeService.listResumesByUserWithSignedUrls({
      userId: studentId,
      jwt: req.user.jwt,
    });
    return res.status(201).json({ success: true, resumes });
  } catch (err) {
    next(err);
  }
}

// HR deletes any resume by id (same service, no ownership check needed for admin)
async function deleteResumeForStudent(req, res, next) {
  try {
    await resumeService.deleteResume({ resumeId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  apply,
  myApplications,
  myAnalytics,
  myCareerProgressBoard,
  allApplications,
  updateStatus,
  updateComment,
  generateAiCommentSuggestion,
  deleteOne,
  applyOnBehalf,
  searchStudents,
  getStudentProfile,
  getStudentResumes,
  uploadResumeForStudent,
  deleteResumeForStudent,
};
