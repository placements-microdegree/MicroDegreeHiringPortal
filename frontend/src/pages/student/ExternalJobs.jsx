// FILE: src/pages/student/ExternalJobs.jsx
// Route: /student/external-jobs  (visible to eligible students only)

import { useEffect, useState } from "react";
import { FiExternalLink, FiRefreshCw, FiBriefcase, FiMapPin, FiClock } from "react-icons/fi";
import { listActiveExternalJobs } from "../../services/externalJobService";
import { showError } from "../../utils/alerts";
import Loader from "../../components/common/Loader";

function ExternalJobCard({ job }) {
    return (
        <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            {/* Company + Role */}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-slate-900">
                        {job.job_role}
                    </div>
                    <div className="mt-0.5 truncate text-sm font-medium text-primary">
                        {job.company}
                    </div>
                </div>
                {/* Company initial avatar */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                    {job.company?.[0]?.toUpperCase() || "?"}
                </div>
            </div>

            {/* Description */}
            {job.description && (
                <p className="mt-3 line-clamp-2 text-sm text-slate-500">{job.description}</p>
            )}

            {/* Meta chips */}
            <div className="mt-4 flex flex-wrap gap-2">
                {job.experience && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        <FiClock className="h-3 w-3" />
                        {job.experience}
                    </span>
                )}
                {job.ctc && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        <span className="text-xs font-bold">₹</span>
                        {job.ctc}
                    </span>
                )}
                {job.location && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                        <FiMapPin className="h-3 w-3" />
                        {job.location}
                    </span>
                )}
            </div>

            {/* Apply button — pushes to bottom */}
            <div className="mt-auto pt-4">
                <a
                    href={job.apply_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
                >
                    <FiExternalLink className="h-4 w-4" />
                    Apply Now
                </a>
            </div>
        </article>
    );
}

export default function ExternalJobs() {
    const [jobs, setJobs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const refresh = async () => {
        setIsLoading(true);
        try {
            const data = await listActiveExternalJobs();
            setJobs(data);
        } catch (err) {
            await showError(err?.message || "Failed to load jobs");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { refresh(); }, []);

    return (
        <div className="space-y-5">
            {/* Header */}
            <section className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                    <h1 className="text-lg font-semibold text-slate-900">External Job Opportunities</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Curated openings from top companies — click Apply Now to go to their careers page.
                    </p>
                </div>
                <button type="button" onClick={refresh} disabled={isLoading}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary disabled:opacity-50">
                    <FiRefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    {isLoading ? "Refreshing..." : "Refresh"}
                </button>
            </section>

            {/* Grid */}
            {isLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
                    <Loader label="Loading opportunities..." />
                </div>
            ) : jobs.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white text-center shadow-sm">
                    <FiBriefcase className="h-8 w-8 text-slate-300" />
                    <p className="text-sm text-slate-500">No external jobs available right now.</p>
                    <p className="text-xs text-slate-400">Check back later — new opportunities are added regularly.</p>
                </div>
            ) : (
                <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {jobs.map((job) => (
                        <ExternalJobCard key={job.id} job={job} />
                    ))}
                </section>
            )}
        </div>
    );
}