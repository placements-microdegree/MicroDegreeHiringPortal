import Button from "../common/Button";
import {
  FiBriefcase,
  FiCalendar,
  FiClock,
  FiMapPin,
  FiMonitor,
} from "react-icons/fi";

export default function JobCard({ job, onApply, applied }) {
  const validTill = job.valid_till || job.validTill;
  const formattedValidTill = validTill
    ? new Date(validTill).toLocaleDateString()
    : "Not specified";

  const infoItems = [
    {
      key: "location",
      label: "Location",
      value: job.location || "Not specified",
      Icon: FiMapPin,
    },
    {
      key: "experience",
      label: "Experience",
      value: job.experience || "Not specified",
      Icon: FiBriefcase,
    },
    {
      key: "validTill",
      label: "Valid Till",
      value: formattedValidTill,
      Icon: FiCalendar,
    },
    {
      key: "noticePeriod",
      label: "Notice Period",
      value: job.notice_period || job.noticePeriod || "Not specified",
      Icon: FiClock,
    },
    {
      key: "workMode",
      label: "Work Mode",
      value: job.work_mode || job.workMode || "Not specified",
      Icon: FiMonitor,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[460px] rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between ">
        <div className="">
          <h3 className="text-sm font-semibold text-slate-900">{job.title}</h3>
          <p className="text-xs font-medium text-slate-600">{job.company}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {(job.skills || []).length > 0 ? (
          job.skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary"
            >
              {skill}
            </span>
          ))
        ) : (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            Skills not specified
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {infoItems.map((item) => {
          const ItemIcon = item.Icon;

          return (
            <div key={item.key} className="rounded-lg  border-slate-200 p-2">
              <div className="mb-1 flex items-center gap-1.5 text-slate-500">
                <ItemIcon className="text-xs" />
                <span className="text-[11px] font-semibold uppercase tracking-wide">
                  {item.label}
                </span>
              </div>
              <div className="text-[11px] font-medium text-slate-800">
                {item.value}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        {job.jd_link ? (
          <a
            href={job.jd_link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            View JD
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex cursor-not-allowed items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-400"
          >
            JD Not Available
          </button>
        )}

        <Button
          onClick={() => onApply?.(job)}
          disabled={applied}
          className="px-3 py-1.5 text-xs"
        >
          {applied ? "Applied" : "Apply"}
        </Button>
      </div>
    </div>
  );
}
