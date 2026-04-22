import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/authStore";
import { FiArrowDown, FiRefreshCw } from "react-icons/fi";
import { getStudentAnalytics, listApplicationsByStudent } from "../../services/applicationService";
import { showError } from "../../utils/alerts";

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
  // Legacy values rendered in their new equivalents.
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
      nextStep: "Use available credits for applications or enroll to unlock full assistance workflow.",
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

function MilestoneStep({ step }) {
  const isCompleted = step.state === "completed";
  const isCurrent = step.state === "current";
  const isLocked = step.state === "locked";

  const markerClass = isCompleted
    ? "bg-emerald-500 text-white border-emerald-500"
    : isCurrent
      ? "bg-amber-100 text-amber-700 border-amber-300"
      : "bg-slate-100 text-slate-400 border-slate-300";

  return (
    <div className="relative pl-11">
      <div
        className={`absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border text-sm font-bold ${markerClass}`}
      >
        {isCompleted ? "OK" : isCurrent ? "NOW" : "L"}
      </div>
      <div className={`rounded-xl border px-4 py-3 ${isCurrent ? "border-amber-300 bg-amber-50" : isCompleted ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
        <p className="text-sm font-semibold text-slate-900">{step.title}</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
          {step.status}
        </p>
        {step?.isBlocker ? (
          <p className="mt-1 inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
            Current Blocker
          </p>
        ) : null}
        {!isCurrent && !isCompleted && isLocked ? (
          <p className="mt-1 inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
            Locked
          </p>
        ) : null}
        <p className="mt-1 text-sm text-slate-700">{step.message}</p>
        {step?.cta ? (
          <Link
            to={step.cta.to}
            className="mt-3 inline-flex rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary/90"
          >
            {step.cta.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

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

  let tableBodyContent;
  if (isLoading) {
    tableBodyContent = (
      <tr>
        <td className="px-4 py-4 text-slate-600" colSpan={5}>
          Loading applications...
        </td>
      </tr>
    );
  } else if (rows.length === 0) {
    tableBodyContent = (
      <tr>
        <td className="px-4 py-5 text-center text-slate-600" colSpan={5}>
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
        <tr key={row.id} className="border-t border-slate-200">
          <td className="px-4 py-3 font-medium text-slate-900">
            {row?.jobs?.title || row?.jobTitle || "Job"}
          </td>
          <td className="px-4 py-3 text-slate-700">
            {row?.jobs?.company || row?.company || "Company"}
          </td>
          <td className="px-4 py-3 text-slate-700">
            {formatDate(row?.created_at || row?.createdAt)}
          </td>
          <td className="px-4 py-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
            >
              {status}
            </span>
          </td>
          <td className="px-4 py-3 text-slate-700">
            {commentText ? (
              <div className="space-y-1">
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
                {showCommentToggle ? (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedComments((prev) => ({
                        ...prev,
                        [row.id]: !prev[row.id],
                      }))
                    }
                    className="text-xs font-semibold text-primary hover:text-primary/80"
                  >
                    {isExpanded ? "Read less" : "Read more"}
                  </button>
                ) : null}
              </div>
            ) : (
              "-"
            )}
          </td>
        </tr>
      );
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Your Milestones</h2>
            <p className="text-sm text-slate-600">
              Follow this tracker to know where you are stuck and what to do next.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Current Status: {milestoneFlow.currentStatus}
            </span>
            {milestoneFlow.isProfileOnHold ? (
              <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                Profile On Hold
              </span>
            ) : (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                Profile Active
              </span>
            )}
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
          <p className="text-sm font-semibold text-blue-900">{milestoneFlow.currentMessage}</p>
          <p className="mt-1 text-xs text-blue-800">Next Step: {milestoneFlow.nextStep}</p>
          {milestoneFlow.blockerReason ? (
            <p className="mt-1 text-xs text-blue-700">Why blocked: {milestoneFlow.blockerReason}</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4">
          <div className="space-y-2">
            {milestoneFlow.steps.map((step, index) => (
              <div key={step.id}>
                <MilestoneStep step={step} />
                {index < milestoneFlow.steps.length - 1 ? (
                  <div className="ml-4 flex h-8 items-center text-slate-400">
                    <FiArrowDown className="h-4 w-4" />
                    <span className="ml-2 text-[11px] font-medium uppercase tracking-wide">
                      Flow continues
                    </span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              Application Status
            </h1>
            <p className="text-sm text-slate-600">
              Track your submitted applications and current progress.
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={isLoading}
            aria-label="Refresh applications"
            title="Refresh"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 p-2 text-slate-700 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiRefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Job Title</th>
                <th className="px-4 py-3 font-semibold">Company</th>
                <th className="px-4 py-3 font-semibold">Applied Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Comment</th>
              </tr>
            </thead>
            <tbody>{tableBodyContent}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
