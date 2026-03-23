const pdfParse = require("pdf-parse");
const crypto = require("node:crypto");
const { getSupabaseAdmin, getSupabaseUser } = require("../config/db");

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-3-5-haiku-latest";
const FETCH_TIMEOUT_MS = 12_000;
const MAX_PROMPT_TEXT = 12_000;
const MIN_EXTRACTION_HARD = Number(process.env.AI_MIN_EXTRACTION_HARD || 40);
const MIN_EXTRACTION_SOFT = Number(process.env.AI_MIN_EXTRACTION_SOFT || 180);
const PROMPT_VERSION = "v3";

function createHttpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCommentText(
  value,
  { maxBullets = 3, maxCharsPerBullet = 110 } = {},
) {
  const raw = String(value || "").replace(/\r\n/g, "\n").trim();
  if (!raw) return "";

  let lines = raw
    .split("\n")
    .map((line) => String(line || "").trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    const sentenceParts = String(lines[0] || raw)
      .split(/(?<=[.!?])\s+/)
      .map((part) => String(part || "").trim())
      .filter(Boolean);

    if (sentenceParts.length > 1) {
      lines = sentenceParts;
    }
  }

  const bullets = lines
    .map((line) => line.replace(/^[-•*\d.)\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, maxBullets)
    .map((line) => {
      if (line.length <= maxCharsPerBullet) return `- ${line}`;
      return `- ${line.slice(0, maxCharsPerBullet - 1).trimEnd()}…`;
    });

  return bullets.join("\n");
}

function truncateText(value, max = MAX_PROMPT_TEXT) {
  const text = normalizeText(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseJsonFromModelOutput(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  const fenced = raw.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      // fallback to broader parse below
    }
  }

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  try {
    return JSON.parse(raw.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

function toKeyphraseList(value) {
  return String(value || "")
    .split(/[,/|]/)
    .map((item) => normalizeText(item).toLowerCase())
    .filter((item) => item.length >= 2);
}

function buildSkillEvidence(jobSkills, resumeText, jdText) {
  const normalizedSkills = Array.isArray(jobSkills)
    ? jobSkills
        .map((skill) => normalizeText(skill).toLowerCase())
        .filter(Boolean)
    : toKeyphraseList(jobSkills);

  const resume = String(resumeText || "").toLowerCase();
  const jd = String(jdText || "").toLowerCase();
  const matched = [];
  const missing = [];

  for (const skill of normalizedSkills) {
    if (!skill) continue;
    if (resume.includes(skill)) {
      matched.push(skill);
    } else if (jd.includes(skill)) {
      missing.push(skill);
    }
  }

  return {
    matched_skills: [...new Set(matched)].slice(0, 20),
    missing_skills: [...new Set(missing)].slice(0, 20),
  };
}

function computeCacheKey({ applicationId, resumeUrl, jdUrl, promptVersion }) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        applicationId: String(applicationId || ""),
        resumeUrl: String(resumeUrl || ""),
        jdUrl: String(jdUrl || ""),
        promptVersion: String(promptVersion || "v1"),
      }),
    )
    .digest("hex");
}

function buildQualityGate({ resumeChars, jdChars, confidence }) {
  const reasons = [];
  if (resumeChars < MIN_EXTRACTION_SOFT) {
    reasons.push(
      `Resume extracted text is low (${resumeChars} chars, expected >= ${MIN_EXTRACTION_SOFT})`,
    );
  }
  if (jdChars < MIN_EXTRACTION_SOFT) {
    reasons.push(
      `JD extracted text is low (${jdChars} chars, expected >= ${MIN_EXTRACTION_SOFT})`,
    );
  }
  if (String(confidence || "").toLowerCase() === "low") {
    reasons.push("Model confidence is low");
  }

  return {
    passed: reasons.length === 0,
    min_chars: MIN_EXTRACTION_SOFT,
    resume_chars: resumeChars,
    jd_chars: jdChars,
    reasons,
  };
}

function getClaudeModelCandidates() {
  const configured = String(CLAUDE_MODEL || "").trim();
  const candidates = [
    configured,
    "claude-sonnet-4-20250514",
    // "claude-opus-4-20250514",
    "claude-3-7-sonnet-latest",
    "claude-3-5-sonnet-latest",
    "claude-3-5-haiku-latest",
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  return [...new Set(candidates)];
}

function parseAnthropicErrorPayload(payload, rawText, status) {
  const messageFromPayload =
    payload?.error?.message || payload?.message || payload?.error || "";
  const message =
    String(messageFromPayload || "").trim() ||
    String(rawText || "").trim() ||
    `Claude API request failed with status ${status}`;

  const type = String(payload?.error?.type || payload?.type || "").trim();
  const lowered = message.toLowerCase();
  const isModelError =
    lowered.includes("model") &&
    (lowered.includes("not found") ||
      lowered.includes("not available") ||
      lowered.includes("does not exist") ||
      lowered.includes("unsupported"));

  return {
    message,
    type,
    shouldTryAnotherModel:
      isModelError ||
      type === "not_found_error" ||
      type === "invalid_request_error",
  };
}

function extractGoogleDriveFileId(url) {
  const text = String(url || "");
  const fromPath = text.match(/\/file\/d\/([^/]+)/i);
  if (fromPath?.[1]) return fromPath[1];
  try {
    const parsed = new URL(text);
    return parsed.searchParams.get("id") || "";
  } catch {
    return "";
  }
}

function extractGoogleDocId(url) {
  const text = String(url || "");
  const fromDoc = text.match(/\/document\/d\/([^/]+)/i);
  if (fromDoc?.[1]) return fromDoc[1];
  return "";
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/pdf,text/plain,text/html,*/*",
        "User-Agent": "MicroDegreeHiringPortal/1.0",
        ...(options.headers || {}),
      },
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchDocumentText(url, label) {
  const sourceUrl = String(url || "").trim();
  if (!sourceUrl) return { text: "", sourceUrl: "", sourceType: "none" };

  const candidates = [sourceUrl];
  const driveFileId = extractGoogleDriveFileId(sourceUrl);
  if (driveFileId) {
    candidates.push(
      `https://drive.google.com/uc?export=download&id=${driveFileId}`,
    );
  }

  const docId = extractGoogleDocId(sourceUrl);
  if (docId) {
    candidates.push(
      `https://docs.google.com/document/d/${docId}/export?format=txt`,
    );
  }

  let lastError = null;
  for (const candidate of candidates) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const response = await fetchWithTimeout(candidate);
      if (!response.ok) {
        lastError = new Error(
          `${label} fetch failed (${response.status}) for ${candidate}`,
        );
        continue;
      }

      const contentType = (response.headers.get("content-type") || "")
        .toLowerCase()
        .trim();

      if (
        contentType.includes("application/pdf") ||
        candidate.toLowerCase().includes(".pdf")
      ) {
        // eslint-disable-next-line no-await-in-loop
        const pdfBuffer = Buffer.from(await response.arrayBuffer());
        // eslint-disable-next-line no-await-in-loop
        const parsed = await pdfParse(pdfBuffer);
        const text = truncateText(parsed?.text || "");
        if (text) {
          return {
            text,
            sourceUrl: candidate,
            sourceType: "pdf",
          };
        }
      }

      // eslint-disable-next-line no-await-in-loop
      const bodyText = await response.text();
      const extracted = contentType.includes("text/html")
        ? stripHtml(bodyText)
        : normalizeText(bodyText);

      if (extracted) {
        return {
          text: truncateText(extracted),
          sourceUrl: candidate,
          sourceType: contentType.includes("text/html") ? "html" : "text",
        };
      }
    } catch (err) {
      lastError = err;
    }
  }

  return {
    text: "",
    sourceUrl,
    sourceType: "unreadable",
    error: lastError?.message || "Unable to extract text",
  };
}

function buildPrompt(application, resumeDoc, jdDoc) {
  const student = application?.profiles || {};
  const job = application?.jobs || {};

  const studentSummary = {
    name: student.full_name || "",
    email: student.email || "",
    phone: student.phone || "",
    location: student.location || "",
    total_experience: student.total_experience || "",
    current_ctc: student.current_ctc || "",
    expected_ctc: student.expected_ctc || "",
  };

  const jobSummary = {
    title: job.title || "",
    company: job.company || "",
    experience: job.experience || "",
    location: job.location || "",
    work_mode: job.work_mode || "",
    interview_mode: Array.isArray(job.interview_mode)
      ? job.interview_mode.join(", ")
      : job.interview_mode || "",
    skills: Array.isArray(job.skills)
      ? job.skills.join(", ")
      : job.skills || "",
    description: job.description || "",
    jd_link: job.jd_link || "",
  };

  return [
    "You are an HR copilot for application screening.",
    "Task: Compare the candidate resume with the JD and generate two comments.",
    "",
    "Output MUST be valid JSON only (no markdown):",
    "{",
    '  "fit_score": number (0-100),',
    '  "confidence": "low"|"medium"|"high",',
    '  "hr_comment": string,',
    '  "student_comment": string,',
    '  "summary": string,',
    '  "missing_requirements": string[]',
    "}",
    "",
    "Rules:",
    "- hr_comment MUST be 2-3 short bullet points using '-' prefix.",
    "- student_comment MUST be 2-3 short bullet points using '-' prefix.",
    "- Keep each bullet simple, human, and under ~14 words.",
    "- Do not write long paragraphs.",
    "- Do not fabricate details absent in provided data.",
    "- If JD/resume text is limited, mention that in summary and lower confidence.",
    "",
    `Student Summary: ${JSON.stringify(studentSummary)}`,
    `Job Summary: ${JSON.stringify(jobSummary)}`,
    `Resume Source: ${resumeDoc.sourceUrl || "N/A"} (${resumeDoc.sourceType || "N/A"})`,
    `JD Source: ${jdDoc.sourceUrl || "N/A"} (${jdDoc.sourceType || "N/A"})`,
    "",
    "Resume Extract:",
    truncateText(resumeDoc.text || "", MAX_PROMPT_TEXT),
    "",
    "JD Extract:",
    truncateText(jdDoc.text || "", MAX_PROMPT_TEXT),
  ].join("\n");
}

async function callClaudeForSuggestion(prompt) {
  const apiKey = String(process.env.CLAUDE_API_KEY || "").trim();
  if (!apiKey) {
    throw createHttpError(
      500,
      "CLAUDE_API_KEY is missing in backend environment",
    );
  }

  const modelCandidates = getClaudeModelCandidates();
  let lastErrorMessage = "";

  for (let index = 0; index < modelCandidates.length; index += 1) {
    const model = modelCandidates[index];

    // eslint-disable-next-line no-await-in-loop
    const response = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 900,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    // eslint-disable-next-line no-await-in-loop
    const raw = await response.text();
    let payload = {};
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch {
      payload = {};
    }

    if (!response.ok) {
      const parsedError = parseAnthropicErrorPayload(
        payload,
        raw,
        response.status,
      );
      lastErrorMessage = parsedError.message;

      const canRetryModel =
        parsedError.shouldTryAnotherModel && index < modelCandidates.length - 1;
      if (canRetryModel) {
        // eslint-disable-next-line no-continue
        continue;
      }

      throw createHttpError(
        502,
        `Claude request failed for model '${model}': ${parsedError.message}`,
      );
    }

    const content = Array.isArray(payload?.content)
      ? payload.content
          .map((item) => (item?.type === "text" ? item.text : ""))
          .join("\n")
      : "";

    const parsed = parseJsonFromModelOutput(content);
    if (!parsed) {
      throw createHttpError(502, "AI response could not be parsed");
    }

    const fitScore = Number(parsed.fit_score);
    return {
      fit_score:
        Number.isFinite(fitScore) && fitScore >= 0 && fitScore <= 100
          ? Math.round(fitScore)
          : null,
      confidence: ["low", "medium", "high"].includes(parsed.confidence)
        ? parsed.confidence
        : "medium",
      hr_comment: normalizeCommentText(parsed.hr_comment || ""),
      student_comment: normalizeCommentText(parsed.student_comment || ""),
      summary: normalizeText(parsed.summary || ""),
      missing_requirements: Array.isArray(parsed.missing_requirements)
        ? parsed.missing_requirements
            .map((item) => normalizeText(item))
            .filter(Boolean)
        : [],
    };
  }

  throw createHttpError(
    502,
    lastErrorMessage ||
      "Claude request failed for all configured model candidates",
  );
}

function getWriteClient(jwt) {
  return getSupabaseAdmin() || getSupabaseUser(jwt);
}

async function readCachedSuggestion({ cacheKey, jwt }) {
  const supabase = getWriteClient(jwt);
  const { data, error } = await supabase
    .from("ai_comment_suggestions")
    .select("*")
    .eq("cache_key", cacheKey)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    // Cache is an optimization. Never block main AI flow due to cache read issues.
    // eslint-disable-next-line no-console
    console.warn(
      "[aiCommentService] cache read skipped:",
      error.code || error.message,
    );
    return null;
  }
  return data || null;
}

async function insertOrUpdateSuggestion({ jwt, payload }) {
  const supabase = getWriteClient(jwt);
  const { data, error } = await supabase
    .from("ai_comment_suggestions")
    .upsert(payload, {
      onConflict: "cache_key",
    })
    .select("*")
    .single();

  if (error) {
    // Cache persistence should not fail the primary AI suggestion request.
    // eslint-disable-next-line no-console
    console.warn(
      "[aiCommentService] cache upsert skipped:",
      error.code || error.message,
    );
    return null;
  }
  return data;
}

async function logAuditEvent({
  jwt,
  applicationId,
  suggestionId,
  actorId,
  eventType,
  payload,
}) {
  const supabase = getWriteClient(jwt);
  const { error } = await supabase.from("ai_comment_audit_events").insert({
    application_id: applicationId,
    suggestion_id: suggestionId || null,
    actor_id: actorId || null,
    event_type: eventType,
    payload: payload || {},
  });

  // Audit logging should never block HR workflow.
  if (error) {
    // eslint-disable-next-line no-console
    console.warn(
      "[aiCommentService] audit log skipped:",
      error.code || error.message,
    );
  }
}

async function getApplicationForAi({ applicationId, jwt }) {
  const supabase = getSupabaseAdmin() || getSupabaseUser(jwt);
  const { data, error } = await supabase
    .from("applications")
    .select(
      `
      id,
      selected_resume_url,
      jobs!inner(
        id,
        title,
        company,
        description,
        skills,
        experience,
        location,
        work_mode,
        interview_mode,
        jd_link
      ),
      profiles:student_id!inner(
        id,
        full_name,
        email,
        phone,
        location,
        total_experience,
        current_ctc,
        expected_ctc,
        resumes(file_url, file_name)
      )
    `,
    )
    .eq("id", applicationId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw createHttpError(404, "Application not found");
  return data;
}

async function generateApplicationCommentSuggestion({
  applicationId,
  jwt,
  actorId,
  regenerate = false,
}) {
  const application = await getApplicationForAi({ applicationId, jwt });

  const selectedResumeUrl =
    String(application?.selected_resume_url || "").trim() ||
    String(application?.profiles?.resumes?.[0]?.file_url || "").trim();

  if (!selectedResumeUrl) {
    throw createHttpError(
      400,
      "No resume link found for this application. Ask student/HR to select a resume first.",
    );
  }
  const jdLink = String(application?.jobs?.jd_link || "").trim();

  const cacheKey = computeCacheKey({
    applicationId,
    resumeUrl: selectedResumeUrl,
    jdUrl: jdLink,
    promptVersion: PROMPT_VERSION,
  });

  if (!regenerate) {
    const cached = await readCachedSuggestion({ cacheKey, jwt });
    if (cached) {
      const suggestion = {
        id: cached.id,
        fit_score: cached.fit_score,
        confidence: cached.confidence,
        hr_comment: cached.hr_comment,
        student_comment: cached.student_comment,
        summary: cached.summary,
        missing_requirements: Array.isArray(cached.missing_requirements)
          ? cached.missing_requirements
          : [],
        matched_skills: Array.isArray(cached.matched_skills)
          ? cached.matched_skills
          : [],
        missing_skills: Array.isArray(cached.missing_skills)
          ? cached.missing_skills
          : [],
        quality_gate: cached.quality_gate || {},
        sources: cached.sources || {},
        model_used: cached.model_used,
        prompt_version: cached.prompt_version,
        generated_at: cached.generated_at,
        cached: true,
      };

      await logAuditEvent({
        jwt,
        applicationId,
        suggestionId: cached.id,
        actorId,
        eventType: "ai_comment_cache_hit",
        payload: { cache_key: cacheKey },
      });

      return suggestion;
    }
  }

  const [resumeDoc, jdDoc] = await Promise.all([
    fetchDocumentText(selectedResumeUrl, "Resume"),
    fetchDocumentText(jdLink, "JD"),
  ]);

  const resumeChars = String(resumeDoc.text || "").length;
  const jdChars = String(jdDoc.text || "").length;

  if (resumeChars < MIN_EXTRACTION_HARD || jdChars < MIN_EXTRACTION_HARD) {
    throw createHttpError(
      422,
      `Insufficient text extracted for AI match (resume: ${resumeChars}, jd: ${jdChars}). Ensure both links are accessible and contain readable content.`,
    );
  }

  const prompt = buildPrompt(application, resumeDoc, jdDoc);
  const suggestion = await callClaudeForSuggestion(prompt);
  const skillEvidence = buildSkillEvidence(
    application?.jobs?.skills,
    resumeDoc.text,
    jdDoc.text,
  );
  const qualityGate = buildQualityGate({
    resumeChars,
    jdChars,
    confidence: suggestion.confidence,
  });

  const payload = {
    application_id: applicationId,
    student_id: application?.profiles?.id || null,
    job_id: application?.jobs?.id || null,
    resume_url: selectedResumeUrl,
    jd_url: jdLink,
    cache_key: cacheKey,
    model_used: String(process.env.CLAUDE_MODEL || CLAUDE_MODEL || "").trim(),
    prompt_version: PROMPT_VERSION,
    fit_score: suggestion.fit_score,
    confidence: suggestion.confidence,
    hr_comment: suggestion.hr_comment,
    student_comment: suggestion.student_comment,
    summary: suggestion.summary,
    missing_requirements: suggestion.missing_requirements,
    matched_skills: skillEvidence.matched_skills,
    missing_skills: skillEvidence.missing_skills,
    quality_gate: qualityGate,
    sources: {
      resume: {
        url: selectedResumeUrl,
        extracted: Boolean(resumeDoc.text),
        type: resumeDoc.sourceType,
      },
      jd: {
        url: jdLink,
        extracted: Boolean(jdDoc.text),
        type: jdDoc.sourceType,
      },
    },
    generated_by: actorId || null,
    generated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const saved = await insertOrUpdateSuggestion({ jwt, payload });

  await logAuditEvent({
    jwt,
    applicationId,
    suggestionId: saved?.id || null,
    actorId,
    eventType: regenerate ? "ai_comment_regenerated" : "ai_comment_generated",
    payload: {
      cache_key: cacheKey,
      quality_gate: qualityGate,
    },
  });

  return {
    id: saved?.id || null,
    ...suggestion,
    matched_skills: skillEvidence.matched_skills,
    missing_skills: skillEvidence.missing_skills,
    quality_gate: qualityGate,
    model_used: payload.model_used,
    prompt_version: PROMPT_VERSION,
    generated_at: payload.generated_at,
    cached: false,
    sources: {
      resume: {
        url: selectedResumeUrl,
        extracted: Boolean(resumeDoc.text),
        type: resumeDoc.sourceType,
      },
      jd: {
        url: jdLink,
        extracted: Boolean(jdDoc.text),
        type: jdDoc.sourceType,
      },
    },
  };
}

async function logAiApprovalEvent({
  applicationId,
  suggestionId,
  actorId,
  jwt,
  approved = true,
}) {
  return logAuditEvent({
    jwt,
    applicationId,
    suggestionId,
    actorId,
    eventType: approved ? "ai_comment_applied" : "ai_comment_not_applied",
    payload: { approved: Boolean(approved) },
  });
}

module.exports = {
  generateApplicationCommentSuggestion,
  logAiApprovalEvent,
};
