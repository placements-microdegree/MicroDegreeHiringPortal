// FILE: src/components/student/JobCard.jsx

import { useState } from "react";
import Button from "../common/Button";
import { FiCalendar, FiMapPin, FiClock } from "react-icons/fi";

const workModeClass = {
  remote: "bg-sky-100 text-sky-700",
  hybrid: "bg-indigo-100 text-indigo-700",
  onsite: "bg-emerald-100 text-emerald-700",
};

// ── Validity display ──────────────────────────────────────────────────────────

function getValidityDisplay(validTill) {
  if (!validTill) return { type: "date", text: "Not specified" };

  const expiry = new Date(validTill);
  if (Number.isNaN(expiry.getTime())) return { type: "date", text: "Not specified" };

  const nowMs   = Date.now();
  const diffMs  = expiry.getTime() - nowMs;

  // Already expired
  if (diffMs <= 0) return { type: "expired", text: "Expired" };

  const diffHours   = diffMs / (1000 * 60 * 60);
  const diffMinutes = diffMs / (1000 * 60);

  // Under 24 hours — show countdown
  if (diffHours < 24) {
    if (diffMinutes < 60) {
      const mins = Math.floor(diffMinutes);
      return { type: "urgent", text: `${mins} minute${mins !== 1 ? "s" : ""} left to apply` };
    }
    const hours = Math.floor(diffHours);
    const mins  = Math.floor(diffMinutes % 60);
    const minPart = mins > 0 ? ` ${mins}m` : "";
    return { type: "urgent", text: `${hours}h${minPart} left to apply` };
  }

  // More than 24 hours — show date only
  const text = expiry.toLocaleDateString("en-IN", {
    day:   "numeric",
    month: "short",
    year:  "numeric",
  });
  return { type: "date", text: `Valid till ${text}` };
}

// ── Skills with +more ─────────────────────────────────────────────────────────

const SKILLS_VISIBLE = 2;

function SkillsList({ skills }) {
  const [expanded, setExpanded] = useState(false);

  if (!skills.length) {
    return (
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
        Skills not specified
      </span>
    );
  }

  const visible = expanded ? skills : skills.slice(0, SKILLS_VISIBLE);
  const hidden  = skills.length - SKILLS_VISIBLE;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map((skill) => (
        <span
          key={skill}
          className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
        >
          {skill}
        </span>
      ))}
      {!expanded && hidden > 0 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
          className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
        >
          +{hidden} more
        </button>
      )}
      {expanded && hidden > 0 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
          className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-400 transition hover:border-slate-300"
        >
          show less
        </button>
      )}
    </div>
  );
}

// ── normalizeSkills ───────────────────────────────────────────────────────────

function normalizeSkills(skills) {
  if (Array.isArray(skills)) return skills.filter(Boolean);
  if (typeof skills === "string" && skills.trim())
    return skills.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

// ── JobCard ───────────────────────────────────────────────────────────────────

export default function JobCard({ job, onApply, applied }) {
  const validTill   = job?.valid_till || job?.validTill;
  const workMode    = String(job?.work_mode || job?.workMode || "Not specified");
  const modeBadge   = workModeClass[workMode.toLowerCase()] || "bg-slate-100 text-slate-700";
  const skills      = normalizeSkills(job?.skills);
  const validity    = getValidityDisplay(validTill);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">

      {/* Title + work mode badge */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{job?.title}</h3>
          <p className="mt-0.5 text-sm text-slate-600">{job?.company}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${modeBadge}`}>
          {workMode}
        </span>
      </div>

      {/* Details */}
      <div className="mt-4 space-y-2 text-sm text-slate-700">
        <div className="flex items-center gap-2">
          <FiMapPin className="h-4 w-4 shrink-0 text-slate-400" />
          <span>{job?.location || "Location not specified"}</span>
        </div>

        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">CTC(in LPA)</span>
          <div className="mt-0.5 text-sm font-semibold text-slate-800">
            {job?.ctc || "Not specified"}
          </div>
        </div>

        {/* Validity — countdown or date */}
        <div className={`flex items-center gap-2 ${validity.type === "expired" ? "text-red-500" : validity.type === "urgent" ? "text-amber-600" : "text-slate-600"}`}>
          {validity.type === "urgent" ? (
            <FiClock className="h-4 w-4 shrink-0" />
          ) : (
            <FiCalendar className="h-4 w-4 shrink-0 text-slate-400" />
          )}
          <span className={`text-sm ${validity.type === "urgent" ? "font-semibold" : ""}`}>
            {validity.text}
          </span>
        </div>
      </div>

      {/* Skills — max 2 visible, +more button */}
      <div className="mt-4">
        <SkillsList skills={skills} />
      </div>

      {/* Actions */}
      <div className="mt-5 flex items-center justify-between gap-2">
        {job?.jd_link ? (
          <a
            href={job.jd_link}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            View JD
          </a>
        ) : (
          <span className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-400">
            JD unavailable
          </span>
        )}

        <Button
          onClick={() => onApply?.(job)}
          disabled={applied || validity.type === "expired"}
          className="min-w-24"
        >
          {applied ? "Applied" : validity.type === "expired" ? "Closed" : "Apply"}
        </Button>
      </div>
    </article>
  );
}