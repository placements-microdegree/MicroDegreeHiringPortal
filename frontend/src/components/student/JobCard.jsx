import Button from "../common/Button";
import { FiCalendar, FiMapPin } from "react-icons/fi";

const workModeClass = {
  remote: "bg-sky-100 text-sky-700",
  hybrid: "bg-indigo-100 text-indigo-700",
  onsite: "bg-emerald-100 text-emerald-700",
};

function formatDate(dateInput) {
  if (!dateInput) return "Not specified";
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "Not specified";
  return date.toLocaleDateString();
}

function normalizeSkills(skills) {
  if (Array.isArray(skills)) return skills;
  if (typeof skills === "string" && skills.trim()) {
    return skills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);
  }
  return [];
}

export default function JobCard({ job, onApply, applied }) {
  const validTill = job?.valid_till || job?.validTill;
  const workMode = String(job?.work_mode || job?.workMode || "Not specified");
  const normalizedWorkMode = workMode.toLowerCase();
  const modeBadgeClass =
    workModeClass[normalizedWorkMode] || "bg-slate-100 text-slate-700";
  const skills = normalizeSkills(job?.skills);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{job?.title}</h3>
          <p className="mt-1 text-sm text-slate-600">{job?.company}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${modeBadgeClass}`}>
          {workMode}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-700">
        <div className="flex items-center gap-2">
          <FiMapPin className="h-4 w-4 text-slate-400" />
          <span>{job?.location || "Location not specified"}</span>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            CTC
          </span>
          <div className="mt-0.5 text-sm font-semibold text-slate-800">
            {job?.ctc || "Not specified"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FiCalendar className="h-4 w-4 text-slate-400" />
          <span>Valid till {formatDate(validTill)}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {skills.length > 0 ? (
          skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
            >
              {skill}
            </span>
          ))
        ) : (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            Skills not specified
          </span>
        )}
      </div>

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
          disabled={applied}
          className="min-w-24"
        >
          {applied ? "Applied" : "Apply"}
        </Button>
      </div>
    </article>
  );
}
