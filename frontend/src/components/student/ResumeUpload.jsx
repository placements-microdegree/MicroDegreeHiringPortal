export default function ResumeUpload({ resumes = [], onUpload, onDelete }) {
  const resumeInputId = "resume-upload-input";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-sm font-semibold text-slate-900">Resumes</div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <label
          htmlFor={resumeInputId}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M12 16V4" />
            <path d="m7 9 5-5 5 5" />
            <path d="M20 16.6A4.6 4.6 0 0 1 15.4 21H8.6A4.6 4.6 0 0 1 4 16.4a4.6 4.6 0 0 1 4.4-4.6" />
          </svg>
          Select Resume Files
        </label>
        <input
          id={resumeInputId}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => onUpload?.(Array.from(e.target.files || []))}
        />
      </div>
      <div className="mt-3 space-y-1">
        {resumes.length === 0 ? (
          <div className="text-xs text-slate-600">No resumes uploaded yet.</div>
        ) : (
          resumes.map((r) => (
            <div
              key={r.id || r.storage_path || r.file_url}
              className="flex items-center justify-between rounded-xl bg-bgLight px-3 py-2 gap-3"
            >
              <div className="text-sm text-slate-800">
                {r.file_name || r.name}
              </div>
              <a
                href={r.signed_url || r.file_url || r.url}
                className="text-sm font-semibold text-primary"
                target="_blank"
                rel="noreferrer"
              >
                View
              </a>
              {onDelete ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-red-600 hover:text-red-700"
                  onClick={() => onDelete(r)}
                >
                  Delete
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
