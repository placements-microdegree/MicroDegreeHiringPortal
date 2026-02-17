export default function ResumeUpload({ resumes = [], onUpload, onDelete }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-sm font-semibold text-slate-900">Resumes</div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <input
          type="file"
          multiple
          className="block w-full text-sm"
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
