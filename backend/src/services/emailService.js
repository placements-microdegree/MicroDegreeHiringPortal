// FILE: services/emailService.js

const nodemailer = require("nodemailer");
const { getSupabaseAdmin } = require("../config/db");
const { ROLES } = require("../utils/constants");

/**
 * Lazy-initialised transporter so env vars are definitely loaded
 * by the time we first send an email (important on DigitalOcean App Platform).
 */
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.error(
      "[emailService] SMTP not configured — SMTP_HOST, SMTP_USER, or SMTP_PASS is missing.",
    );
    return null;
  }

  _transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user, pass },
  });

  return _transporter;
}

/**
 * Fetch emails of all eligible students (is_eligible = true).
 */
async function getEligibleStudentEmails() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("email")
    .eq("role", ROLES.STUDENT)
    .eq("is_eligible", true)
    .not("email", "is", null);

  if (error) {
    console.error(
      "[emailService] Failed to fetch eligible students:",
      error.message,
    );
    return [];
  }

  return (data || []).map((row) => row.email).filter(Boolean);
}

/**
 * Build the HTML email body for a new job posting.
 */
function buildJobEmailHtml(job) {
  const skills = Array.isArray(job.skills)
    ? job.skills.join(", ")
    : job.skills || "N/A";
  const interviewModes = Array.isArray(job.interview_mode)
    ? job.interview_mode.join(", ")
    : job.interview_mode || "N/A";
  const validTill = job.valid_till
    ? new Date(job.valid_till).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f7;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:30px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <!-- Header -->
            <tr>
              <td style="background: linear-gradient(135deg, #4f46e5, #e11d48); padding:28px 32px; text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:0.5px;">
                  🎯 New Job Opportunity!
                </h1>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">A new opportunity is waiting for you</p>
                <h2 style="margin:0 0 4px;font-size:22px;color:#111827;">${job.title}</h2>
                <p style="margin:0 0 24px;font-size:16px;color:#4f46e5;font-weight:600;">${job.company}</p>

                <!-- Details Table -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                  <tr>
                    <td style="padding:10px 12px;background:#f9fafb;border-radius:6px 6px 0 0;border-bottom:1px solid #e5e7eb;">
                      <span style="font-size:13px;color:#6b7280;">📍 Location</span><br/>
                      <span style="font-size:15px;color:#111827;font-weight:500;">${job.location || "N/A"}</span>
                    </td>
                    <td style="padding:10px 12px;background:#f9fafb;border-radius:6px 6px 0 0;border-bottom:1px solid #e5e7eb;">
                      <span style="font-size:13px;color:#6b7280;">💼 Work Mode</span><br/>
                      <span style="font-size:15px;color:#111827;font-weight:500;">${job.work_mode || "N/A"}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 12px;background:#ffffff;border-bottom:1px solid #e5e7eb;">
                      <span style="font-size:13px;color:#6b7280;">💰 CTC</span><br/>
                      <span style="font-size:15px;color:#111827;font-weight:500;">${job.ctc || "N/A"}</span>
                    </td>
                    <td style="padding:10px 12px;background:#ffffff;border-bottom:1px solid #e5e7eb;">
                      <span style="font-size:13px;color:#6b7280;">🧑‍💻 Experience</span><br/>
                      <span style="font-size:15px;color:#111827;font-weight:500;">${job.experience || "N/A"}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 12px;background:#f9fafb;border-bottom:1px solid #e5e7eb;">
                      <span style="font-size:13px;color:#6b7280;">📅 Notice Period</span><br/>
                      <span style="font-size:15px;color:#111827;font-weight:500;">${job.notice_period || "N/A"}</span>
                    </td>
                    <td style="padding:10px 12px;background:#f9fafb;border-bottom:1px solid #e5e7eb;">
                      <span style="font-size:13px;color:#6b7280;">🎤 Interview Mode</span><br/>
                      <span style="font-size:15px;color:#111827;font-weight:500;">${interviewModes}</span>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding:10px 12px;background:#ffffff;border-radius:0 0 6px 6px;">
                      <span style="font-size:13px;color:#6b7280;">⏰ Apply Before</span><br/>
                      <span style="font-size:15px;color:#e11d48;font-weight:600;">${validTill}</span>
                    </td>
                  </tr>
                </table>

                <!-- Skills -->
                <div style="margin-bottom:24px;">
                  <p style="margin:0 0 8px;font-size:13px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Skills Required</p>
                  <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${skills}</p>
                </div>

                <!-- Description -->
                <div style="margin-bottom:28px;">
                  <p style="margin:0 0 8px;font-size:13px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Job Description</p>
                  <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${job.description}</p>
                </div>

                <!-- CTA Button -->
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">
                      <a href="${process.env.FRONTEND_ORIGIN || "http://localhost:5173"}/student/jobs"
                         style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.3px;">
                        View &amp; Apply Now →
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
                <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;">
                  You're receiving this because you're an eligible student on <strong>MicroDegree</strong>.
                </p>
                <p style="margin:0;font-size:12px;color:#d1d5db;">
                  © ${new Date().getFullYear()} MicroDegree. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
}

/**
 * Send new-job email to all eligible students.
 * AWS SES limits BCC to 50 recipients per call, so we batch accordingly.
 * Runs in the background — failures are logged, never thrown.
 */
const SES_BCC_LIMIT = 50;

async function notifyEligibleStudentsByEmail(job) {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      console.error(
        "[emailService] Skipping — SMTP transporter not available.",
      );
      return;
    }

    const emails = await getEligibleStudentEmails();
    if (emails.length === 0) {
      console.log("[emailService] No eligible students to notify.");
      return;
    }

    const html = buildJobEmailHtml(job);
    const subject = `🚀 New Job Alert: ${job.title} at ${job.company}`;
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    // Send in batches of 50 to stay within SES recipient limit
    for (let i = 0; i < emails.length; i += SES_BCC_LIMIT) {
      const batch = emails.slice(i, i + SES_BCC_LIMIT);
      // eslint-disable-next-line no-await-in-loop
      const info = await transporter.sendMail({
        from,
        bcc: batch,
        subject,
        html,
      });
      console.log(
        `[emailService] Batch ${Math.floor(i / SES_BCC_LIMIT) + 1} sent to ${batch.length} student(s). MessageId: ${info.messageId}`,
      );
    }

    console.log(
      `[emailService] Job alert sent to ${emails.length} eligible student(s) in ${Math.ceil(emails.length / SES_BCC_LIMIT)} batch(es).`,
    );
  } catch (err) {
    console.error(
      "[emailService] Failed to send job alert emails:",
      err.message,
    );
  }
}

module.exports = { notifyEligibleStudentsByEmail };
