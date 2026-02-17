import Button from "../common/Button";

export default function JobCard({ job, onApply, applied }) {
  const postedDate = job.createdAt || job.created_at || job.created_at;
  return (
    <div className="rounded-xl bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold text-slate-900">
            {job.title}
          </div>
          <div className="mt-1 text-sm text-slate-600">{job.company}</div>
        </div>
        <Button onClick={() => onApply?.(job)} disabled={applied}>
          {applied ? "Applied" : "Apply"}
        </Button>
      </div>
      <div className="mt-3 text-sm text-slate-700">{job.description}</div>
      <div className="mt-4 flex flex-wrap gap-2">
        {job.skills?.map((s) => (
          <span
            key={s}
            className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
          >
            {s}
          </span>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-slate-600">
        <div className="rounded-xl bg-bgLight p-3">
          <div className="font-semibold text-slate-800">Location</div>
          <div>{job.location}</div>
        </div>
        <div className="rounded-xl bg-bgLight p-3">
          <div className="font-semibold text-slate-800">CTC</div>
          <div>{job.ctc}</div>
        </div>
        <div className="rounded-xl bg-bgLight p-3">
          <div className="font-semibold text-slate-800">Posted</div>
          <div>
            {postedDate
              ? new Date(postedDate).toLocaleDateString()
              : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
