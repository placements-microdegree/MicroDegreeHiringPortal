// FILE: src/pages/student/ExternalJobs.jsx
// Route: /student/external-jobs  (visible to eligible students only)

import { useEffect, useMemo, useState } from "react";
import {
  FiExternalLink,
  FiRefreshCw,
  FiBriefcase,
  FiMapPin,
  FiClock,
} from "react-icons/fi";
import { listActiveExternalJobs } from "../../services/externalJobService";
import { showError } from "../../utils/alerts";
import Loader from "../../components/common/Loader";

export default function ExternalJobs() {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [experienceFilter, setExperienceFilter] = useState("all");

  const experienceOptions = useMemo(() => {
    const values = new Set(
      jobs.map((job) => String(job?.experience || "").trim()).filter(Boolean),
    );
    return ["all", ...Array.from(values)];
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    if (experienceFilter === "all") return jobs;
    return jobs.filter(
      (job) => String(job?.experience || "").trim() === experienceFilter,
    );
  }, [jobs, experienceFilter]);

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

  useEffect(() => {
    refresh();
  }, []);

  let content = null;
  if (isLoading) {
    content = (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
        <Loader label="Loading opportunities..." />
      </div>
    );
  } else if (jobs.length === 0) {
    content = (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white text-center shadow-sm">
        <FiBriefcase className="h-8 w-8 text-slate-300" />
        <p className="text-sm text-slate-500">
          No external jobs available right now.
        </p>
        <p className="text-xs text-slate-400">
          Check back later — new opportunities are added regularly.
        </p>
      </div>
    );
  } else {
    content = (
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Company Name</th>
                <th className="px-4 py-3">Job Title</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Experience</th>
                <th className="px-4 py-3">Apply</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job) => (
                <tr
                  key={job.id}
                  className="border-t border-slate-100 transition hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {job.company || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {job.job_role || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <FiMapPin className="h-3.5 w-3.5 text-blue-500" />
                      {job.location || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <FiClock className="h-3.5 w-3.5 text-violet-500" />
                      {job.experience || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={job.apply_link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary/90"
                    >
                      <FiExternalLink className="h-3.5 w-3.5" />
                      Apply
                    </a>
                  </td>
                </tr>
              ))}
              {filteredJobs.length === 0 && (
                <tr className="border-t border-slate-100">
                  <td
                    className="px-4 py-6 text-center text-sm text-slate-500"
                    colSpan={5}
                  >
                    No jobs found for selected experience.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            External Job Opportunities
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Curated openings from top companies — click Apply Now to go to their
            careers page.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary disabled:opacity-50"
        >
          <FiRefreshCw
            className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </section>

      {/* Filters */}
      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label
          htmlFor="experienceFilter"
          className="text-sm font-medium text-slate-700"
        >
          Filter by Experience
        </label>
        <select
          id="experienceFilter"
          value={experienceFilter}
          onChange={(e) => setExperienceFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary"
        >
          {experienceOptions.map((option) => (
            <option key={option} value={option}>
              {option === "all" ? "All Experience" : option}
            </option>
          ))}
        </select>
      </section>

      {content}
    </div>
  );
}
