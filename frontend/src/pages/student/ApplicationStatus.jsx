import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/authStore";
import { FiRefreshCw, FiChevronDown, FiInfo } from "react-icons/fi";
import {
  getStudentAnalytics,
  listApplicationsByStudent,
} from "../../services/applicationService";
import { showError } from "../../utils/alerts";

// ─── Google Font import (Outfit + DM Serif Display) ───────────────────────────
// Add this once to your index.html or global CSS:
// <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet">

const statusClassMap = {
  Applied: "bg-slate-100 text-slate-700",
  "Resume Not Matched": "bg-red-100 text-red-700",
  "Mapped to Client": "bg-blue-100 text-blue-700",
  "Screening call Received": "bg-amber-100 text-amber-700",
  "screening Discolified": "bg-red-100 text-red-700",
  "Interview scheduled": "bg-blue-100 text-blue-700",
  "Interview Not Cleared": "bg-rose-100 text-rose-700",
  "Technical Round": "bg-blue-100 text-blue-700",
  "final Round": "bg-blue-100 text-blue-700",
  Placed: "bg-emerald-100 text-emerald-700",
  "Job on hold": "bg-red-100 text-red-700",
  "Position closed": "bg-red-100 text-red-700",
  Shortlisted: "bg-amber-100 text-amber-700",
  Interview: "bg-blue-100 text-blue-700",
  "Interview Scheduled": "bg-blue-100 text-blue-700",
  "Final Round": "bg-blue-100 text-blue-700",
  Selected: "bg-emerald-100 text-emerald-700",
  "Position Closed": "bg-red-100 text-red-700",
  Rejected: "bg-red-100 text-red-700",
  "Resume Screening Rejected": "bg-red-100 text-red-700",
  "Profile Mapped for client": "bg-blue-100 text-blue-700",
  "Client Rejected": "bg-red-100 text-red-700",
};

function formatDate(dateInput) {
  if (!dateInput) return "N/A";
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString();
}

const MILESTONE_STEPS = [
  "Enrollment Status",
  "Cloud Drive Clearance",
  "Resume Submission & Approval",
  "Premium Job Mapping",
];

const CTA_BY_STEP = {
  enroll: { label: "Enroll Now", to: "/student/career-guide" },
  cloudDrive: { label: "Register for Cloud Drive", to: "/student/cloud-drive" },
  uploadResume: { label: "Upload Resume", to: "/student/dashboard" },
  premiumJobs: { label: "View Premium Jobs", to: "/student/jobs" },
};

function getMilestoneFlow({ profile, readiness }) {
  const isEnrolledStudent = Boolean(profile?.isEligible);
  const remainingCredits = Number(profile?.applicationQuota ?? 0);
  const cloudDriveCleared = Boolean(readiness?.cloudDrive?.isCleared);
  const hasResume = Boolean(readiness?.resumeApproval?.hasActiveResume);
  const resumeApproved = Boolean(readiness?.resumeApproval?.isApproved);

  const steps = MILESTONE_STEPS.map((title, index) => ({
    id: index + 1,
    title,
    state: "locked",
    status: "Locked",
    message: "This step will unlock once you complete previous milestones.",
  }));

  if (!isEnrolledStudent) {
    steps[0] = {
      ...steps[0],
      state: "current",
      isBlocker: true,
      status: "Registered",
      message:
        "You are not a MicroDegree student yet. Please become a student to get access to other features.",
      cta: CTA_BY_STEP.enroll,
    };
    steps[3] = {
      ...steps[3],
      state: "locked",
      status: "Disabled",
      message: `This step will unlock once you complete previous milestones.`,
    };
    return {
      currentStatus: "Registered",
      currentMessage:
        "You are not a MicroDegree student yet. Premium jobs are temporarily open with credit-based applications.",
      nextStep:
        "Use available credits for applications or enroll to unlock full assistance workflow.",
      blockerReason:
        "Enrollment is pending, so mapping assistance workflow remains on hold.",
      isProfileOnHold: true,
      steps,
    };
  }

  steps[0] = {
    ...steps[0],
    state: "completed",
    status: "Completed",
    message: "You are an enrolled MicroDegree student.",
  };

  if (!cloudDriveCleared) {
    steps[1] = {
      ...steps[1],
      state: "current",
      isBlocker: true,
      status: "Cloud Drive Pending",
      message:
        "You must clear the Cloud Drive to become eligible for interview opportunities. Cloud Drive is conducted on 2nd and 4th Saturdays.",
      cta: CTA_BY_STEP.cloudDrive,
    };
    return {
      currentStatus: "Cloud Drive Pending",
      currentMessage:
        "You must clear the Cloud Drive to become eligible for interview opportunities. Cloud Drive is conducted on 2nd and 4th Saturdays.",
      nextStep: "Register and clear the next Cloud Drive.",
      blockerReason:
        "Career progression is blocked until your Cloud Drive is cleared (including reattempt/expired cases).",
      isProfileOnHold: true,
      steps,
    };
  }

  steps[1] = {
    ...steps[1],
    state: "completed",
    status: "Completed",
    message: "Cloud Drive cleared.",
  };

  if (!hasResume) {
    steps[2] = {
      ...steps[2],
      state: "current",
      isBlocker: true,
      status: "Resume Pending",
      message: "Please upload your resume for review by the HR team.",
      cta: CTA_BY_STEP.uploadResume,
    };
    return {
      currentStatus: "Resume Pending",
      currentMessage: "Please upload your resume for review by the HR team.",
      nextStep: "Upload your resume to start HR review.",
      blockerReason: "Resume step remains blocked until a resume is submitted.",
      isProfileOnHold: true,
      steps,
    };
  }

  if (!resumeApproved) {
    steps[2] = {
      ...steps[2],
      state: "current",
      isBlocker: true,
      status: "Resume Under Review / Changes Required",
      message:
        "Your resume is under review. Please make the suggested changes to proceed.",
    };
    return {
      currentStatus: "Resume Under Review / Changes Required",
      currentMessage:
        "Your resume is under review. Please make the suggested changes to proceed.",
      nextStep: "Apply suggested resume changes and wait for approval.",
      blockerReason: "Resume stage stays active until HR approval is complete.",
      isProfileOnHold: true,
      steps,
    };
  }

  steps[2] = {
    ...steps[2],
    state: "completed",
    status: "Completed",
    message: "Resume approved.",
  };

  steps[3] = {
    ...steps[3],
    state: "current",
    status: "Eligible for Premium Job Mapping",
    message:
      "Your profile is approved. Our team will start mapping you to relevant premium job opportunities.",
  };

  return {
    currentStatus: "Eligible for Premium Job Mapping",
    currentMessage:
      "Your profile is approved. Our team will start mapping you to relevant premium job opportunities.",
    nextStep: "Keep profile and resume updated for faster job mapping.",
    blockerReason: null,
    isProfileOnHold: false,
    steps,
  };
}

// ─── Step icon ────────────────────────────────────────────────────────────────
function StepIcon({ state, index }) {
  if (state === "completed") {
    return (
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "#d1fae5",
          border: "2px solid #10b981",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          zIndex: 1,
        }}
      >
        {/* checkmark */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M3 8.5l3.5 3.5 6-7"
            stroke="#10b981"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  if (state === "current") {
    return (
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "#fffbeb",
          border: "2px solid #f59e0b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          zIndex: 1,
          boxShadow: "0 0 0 4px #fef3c7",
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#d97706",
            fontFamily: "Outfit, sans-serif",
          }}
        >
          {index + 1}
        </span>
      </div>
    );
  }

  // locked
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: "#f8fafc",
        border: "2px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        zIndex: 1,
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#cbd5e1",
          fontFamily: "Outfit, sans-serif",
        }}
      >
        {index + 1}
      </span>
    </div>
  );
}

// ─── Individual milestone step ────────────────────────────────────────────────
function MilestoneStep({ step, index, isLast, blockerReason }) {
  const [detailOpen, setDetailOpen] = useState(false);

  const isCompleted = step.state === "completed";
  const isCurrent = step.state === "current";
  const isLocked = step.state === "locked";

  // connector line colour
  const connectorColor = isCompleted ? "#6ee7b7" : "#e2e8f0";

  // card accent
  const cardStyle = isCompleted
    ? { borderColor: "#a7f3d0", background: "#f0fdf9" }
    : isCurrent
      ? { borderColor: "#fcd34d", background: "#fffbeb" }
      : { borderColor: "#e2e8f0", background: "#f8fafc" };

  // status pill colours
  const pillStyle = isCompleted
    ? { background: "#d1fae5", color: "#065f46" }
    : isCurrent
      ? { background: "#fef3c7", color: "#92400e" }
      : { background: "#f1f5f9", color: "#94a3b8" };

  return (
    <div style={{ display: "flex", gap: 0, position: "relative" }}>
      {/* Left column: icon + connector */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: 36,
          flexShrink: 0,
        }}
      >
        <StepIcon state={step.state} index={index} />
        {!isLast && (
          <div
            style={{
              width: 2,
              flex: 1,
              minHeight: 24,
              background: connectorColor,
              borderRadius: 1,
              margin: "4px 0",
            }}
          />
        )}
      </div>

      {/* Right column: card */}
      <div
        style={{
          flex: 1,
          marginLeft: 14,
          paddingBottom: isLast ? 0 : 20,
        }}
      >
        <div
          style={{
            border: "1.5px solid",
            borderRadius: 12,
            padding: "12px 16px",
            ...cardStyle,
            opacity: isLocked ? 0.6 : 1,
            transition: "opacity 0.2s",
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: "Outfit, sans-serif",
                fontWeight: 600,
                fontSize: 14,
                color: isLocked ? "#94a3b8" : "#0f172a",
                letterSpacing: "-0.01em",
              }}
            >
              {step.title}
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {/* Status pill */}
              <span
                style={{
                  ...pillStyle,
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: "Outfit, sans-serif",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  padding: "2px 9px",
                  borderRadius: 999,
                }}
              >
                {step.status}
              </span>

              {/* Blocker badge */}
              {step.isBlocker && (
                <span
                  style={{
                    background: "#ffe4e6",
                    color: "#be123c",
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: "Outfit, sans-serif",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    padding: "2px 8px",
                    borderRadius: 999,
                  }}
                >
                  Blocker
                </span>
              )}
            </div>
          </div>

          {/* Message */}
          {(isCurrent || isCompleted) && (
            <p
              style={{
                marginTop: 6,
                fontSize: 13,
                color: isCompleted ? "#047857" : "#78350f",
                fontFamily: "Outfit, sans-serif",
                lineHeight: 1.5,
              }}
            >
              {step.message}
            </p>
          )}

          {/* "Why blocked" expandable — only on blocker + has reason */}
          {step.isBlocker && blockerReason && (
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setDetailOpen((v) => !v)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "Outfit, sans-serif",
                  color: "#b45309",
                  letterSpacing: "0.02em",
                }}
              >
                <FiInfo size={12} />
                Why is this blocked?
                <FiChevronDown
                  size={12}
                  style={{
                    transform: detailOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }}
                />
              </button>

              {detailOpen && (
                <div
                  style={{
                    marginTop: 6,
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "#fef9c3",
                    border: "1px solid #fde68a",
                    fontSize: 12,
                    color: "#78350f",
                    fontFamily: "Outfit, sans-serif",
                    lineHeight: 1.6,
                  }}
                >
                  {blockerReason}
                </div>
              )}
            </div>
          )}

          {/* CTA */}
          {step.cta && (
            <div style={{ marginTop: 10 }}>
              <Link
                to={step.cta.to}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#f59e0b",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "Outfit, sans-serif",
                  letterSpacing: "0.02em",
                  padding: "6px 14px",
                  borderRadius: 8,
                  textDecoration: "none",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#d97706")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#f59e0b")
                }
              >
                {step.cta.label} →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function ApplicationStatus() {
  const { profile } = useAuth();
  const [rows, setRows] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedComments, setExpandedComments] = useState({});

  const refresh = async () => {
    setIsLoading(true);
    try {
      const [data, analyticsData] = await Promise.all([
        listApplicationsByStudent(),
        getStudentAnalytics(),
      ]);
      setRows(Array.isArray(data) ? data : []);
      setAnalytics(analyticsData || null);
    } catch (error) {
      setAnalytics(null);
      await showError(error?.message || "Failed to load applications");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const milestoneFlow = getMilestoneFlow({
    profile,
    readiness: analytics?.readiness,
  });

  // ─── Table body ─────────────────────────────────────────────────────────────
  let tableBodyContent;
  if (isLoading) {
    tableBodyContent = (
      <tr>
        <td
          style={{
            padding: "16px",
            color: "#64748b",
            fontFamily: "Outfit, sans-serif",
            fontSize: 14,
          }}
          colSpan={5}
        >
          Loading applications…
        </td>
      </tr>
    );
  } else if (rows.length === 0) {
    tableBodyContent = (
      <tr>
        <td
          style={{
            padding: "24px 16px",
            textAlign: "center",
            color: "#94a3b8",
            fontFamily: "Outfit, sans-serif",
            fontSize: 14,
          }}
          colSpan={5}
        >
          No applications yet.
        </td>
      </tr>
    );
  } else {
    tableBodyContent = rows.map((row) => {
      const status = row?.sub_stage || row?.status || "Applied";
      const statusClass =
        statusClassMap[status] || "bg-slate-100 text-slate-700";
      const commentText = String(row?.hr_comment_2 || "").trim();
      const isExpanded = Boolean(expandedComments[row.id]);
      const showCommentToggle =
        commentText.length > 140 || commentText.includes("\n");

      return (
        <tr
          key={row.id}
          style={{
            borderTop: "1px solid #f1f5f9",
            transition: "background 0.1s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "")}
        >
          <td
            style={{
              padding: "12px 16px",
              fontFamily: "Outfit, sans-serif",
              fontWeight: 600,
              fontSize: 13,
              color: "#0f172a",
            }}
          >
            {row?.jobs?.title || row?.jobTitle || "Job"}
          </td>
          <td
            style={{
              padding: "12px 16px",
              fontFamily: "Outfit, sans-serif",
              fontSize: 13,
              color: "#475569",
            }}
          >
            {row?.jobs?.company || row?.company || "Company"}
          </td>
          <td
            style={{
              padding: "12px 16px",
              fontFamily: "Outfit, sans-serif",
              fontSize: 13,
              color: "#64748b",
            }}
          >
            {formatDate(row?.created_at || row?.createdAt)}
          </td>
          <td style={{ padding: "12px 16px" }}>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
              {status}
            </span>
          </td>
          <td
            style={{
              padding: "12px 16px",
              fontFamily: "Outfit, sans-serif",
              fontSize: 13,
              color: "#475569",
            }}
          >
            {commentText ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <p
                  className={`whitespace-pre-wrap ${isExpanded ? "" : "overflow-hidden"}`}
                  style={
                    isExpanded
                      ? undefined
                      : {
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }
                  }
                >
                  {commentText}
                </p>
                {showCommentToggle && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedComments((prev) => ({
                        ...prev,
                        [row.id]: !prev[row.id],
                      }))
                    }
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#f59e0b",
                      padding: 0,
                      fontFamily: "Outfit, sans-serif",
                      textAlign: "left",
                    }}
                  >
                    {isExpanded ? "Read less" : "Read more"}
                  </button>
                )}
              </div>
            ) : (
              <span style={{ color: "#cbd5e1" }}>—</span>
            )}
          </td>
        </tr>
      );
    });
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        fontFamily: "Outfit, sans-serif",
      }}
    >
      {/* ── Milestones card ──────────────────────────────────────────────────── */}
      <section
        style={{
          borderRadius: 18,
          border: "1.5px solid #e2e8f0",
          background: "#fff",
          padding: "24px",
          boxShadow: "0 1px 4px 0 rgba(15,23,42,0.04)",
        }}
      >
        {/* Section header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 700,
                color: "#0f172a",
                letterSpacing: "-0.02em",
                fontFamily: "Outfit, sans-serif",
              }}
            >
              Your Milestones
            </h2>
            <p
              style={{
                margin: "3px 0 0",
                fontSize: 13,
                color: "#94a3b8",
                fontFamily: "Outfit, sans-serif",
              }}
            >
              Follow this tracker to know where you are and what to do next.
            </p>
          </div>

          {/* Status chips */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                background: "#f1f5f9",
                color: "#475569",
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "Outfit, sans-serif",
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                padding: "4px 10px",
                borderRadius: 999,
              }}
            >
              {milestoneFlow.currentStatus}
            </span>
            {milestoneFlow.isProfileOnHold ? (
              <span
                style={{
                  background: "#ffe4e6",
                  color: "#be123c",
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: "Outfit, sans-serif",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  padding: "4px 10px",
                  borderRadius: 999,
                }}
              >
                On Hold
              </span>
            ) : (
              <span
                style={{
                  background: "#d1fae5",
                  color: "#065f46",
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: "Outfit, sans-serif",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  padding: "4px 10px",
                  borderRadius: 999,
                }}
              >
                Active
              </span>
            )}
          </div>
        </div>

        {/* Compact next-step hint bar (replaces large blue box) */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 22,
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1.3, flexShrink: 0 }}>
            ⚡
          </span>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 600,
                color: "#1e293b",
                fontFamily: "Outfit, sans-serif",
              }}
            >
              Next step:{" "}
              <span style={{ fontWeight: 400, color: "#475569" }}>
                {milestoneFlow.nextStep}
              </span>
            </p>
          </div>
        </div>

        {/* Vertical stepper */}
        <div style={{ padding: "0 2px" }}>
          {milestoneFlow.steps.map((step, index) => (
            <MilestoneStep
              key={step.id}
              step={step}
              index={index}
              isLast={index === milestoneFlow.steps.length - 1}
              blockerReason={
                step.isBlocker ? milestoneFlow.blockerReason : null
              }
            />
          ))}
        </div>
      </section>

      {/* ── Application status card ───────────────────────────────────────────── */}
      <section
        style={{
          borderRadius: 18,
          border: "1.5px solid #e2e8f0",
          background: "#fff",
          padding: "24px",
          boxShadow: "0 1px 4px 0 rgba(15,23,42,0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 700,
                color: "#0f172a",
                letterSpacing: "-0.02em",
                fontFamily: "Outfit, sans-serif",
              }}
            >
              Application Status
            </h1>
            <p
              style={{
                margin: "3px 0 0",
                fontSize: 13,
                color: "#94a3b8",
                fontFamily: "Outfit, sans-serif",
              }}
            >
              Track your submitted applications and current progress.
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={isLoading}
            aria-label="Refresh applications"
            title="Refresh"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: 10,
              border: "1.5px solid #e2e8f0",
              background: "#fff",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.5 : 1,
              color: "#64748b",
              transition: "border-color 0.15s, color 0.15s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.borderColor = "#f59e0b";
                e.currentTarget.style.color = "#d97706";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#e2e8f0";
              e.currentTarget.style.color = "#64748b";
            }}
          >
            <FiRefreshCw
              size={15}
              style={
                isLoading
                  ? {
                      animation: "spin 1s linear infinite",
                    }
                  : undefined
              }
            />
          </button>
        </div>

        {/* Table */}
        <div
          style={{
            overflowX: "auto",
            borderRadius: 12,
            border: "1.5px solid #f1f5f9",
          }}
        >
          <table
            style={{
              width: "100%",
              minWidth: 580,
              borderCollapse: "collapse",
              fontSize: 13,
              fontFamily: "Outfit, sans-serif",
            }}
          >
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Job Title", "Company", "Applied Date", "Status", "Comment"].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 16px",
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#94a3b8",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        fontFamily: "Outfit, sans-serif",
                        borderBottom: "1.5px solid #f1f5f9",
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>{tableBodyContent}</tbody>
          </table>
        </div>
      </section>

      {/* Spin keyframe injected once */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}