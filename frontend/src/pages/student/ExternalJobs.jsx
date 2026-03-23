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
import {
  listActiveExternalJobs,
  trackExternalJobsVisit,
  trackExternalJobClick,
} from "../../services/externalJobService";
import { showError } from "../../utils/alerts";
import Loader from "../../components/common/Loader";

export default function ExternalJobs() {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [experienceRange, setExperienceRange] = useState({ min: "", max: "" });
  const [postedDateSort, setPostedDateSort] = useState("newest");

  const parseExperienceRange = (value) => {
    const text = String(value || "")
      .trim()
      .toLowerCase();
    if (!text) return null;

    const matches = text.match(/\d+(?:\.\d+)?/g);
    if (!matches || matches.length === 0) return null;

    const numbers = matches.map(Number).filter((num) => Number.isFinite(num));
    if (numbers.length === 0) return null;

    if (numbers.length === 1) {
      const min = numbers[0];
      const max = text.includes("+") ? Number.POSITIVE_INFINITY : min;
      return { min, max };
    }

    const [first, second] = numbers;
    return first <= second
      ? { min: first, max: second }
      : { min: second, max: first };
  };

  const filteredJobs = useMemo(() => {
    const parsedMin = Number(experienceRange.min);
    const parsedMax = Number(experienceRange.max);

    const hasMin = experienceRange.min !== "" && Number.isFinite(parsedMin);
    const hasMax = experienceRange.max !== "" && Number.isFinite(parsedMax);

    if (!hasMin && !hasMax) return jobs;

    const effectiveMin = hasMin ? parsedMin : Number.NEGATIVE_INFINITY;
    const effectiveMax = hasMax ? parsedMax : Number.POSITIVE_INFINITY;
    const [queryMin, queryMax] =
      effectiveMin <= effectiveMax
        ? [effectiveMin, effectiveMax]
        : [effectiveMax, effectiveMin];

    return jobs.filter((job) => {
      const rawExperience = String(job?.experience || "")
        .trim()
        .toLowerCase();
      if (["na", "n/a", "n.a", "not applicable"].includes(rawExperience)) {
        return true;
      }

      const parsed = parseExperienceRange(job?.experience);
      if (!parsed) return false;
      return parsed.max >= queryMin && parsed.min <= queryMax;
    });
  }, [jobs, experienceRange]);

  const sortedJobs = useMemo(() => {
    const toTime = (value) => {
      const parsed = Date.parse(value || "");
      return Number.isFinite(parsed) ? parsed : 0;
    };

    return [...filteredJobs].sort((a, b) => {
      const aTime = toTime(a?.created_at || a?.updated_at);
      const bTime = toTime(b?.created_at || b?.updated_at);
      return postedDateSort === "oldest" ? aTime - bTime : bTime - aTime;
    });
  }, [filteredJobs, postedDateSort]);

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
    void trackExternalJobsVisit().catch(() => {});
    refresh();
  }, []);

  const onApplyClick = (jobId) => {
    // Fire and forget so navigation is instant while analytics is captured.
    void trackExternalJobClick(jobId).catch(() => {});
  };

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
                <th className="px-4 py-3">Min Experience</th>
                <th className="px-4 py-3">Apply</th>
              </tr>
            </thead>
            <tbody>
              {sortedJobs.map((job) => (
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
                      onClick={() => onApplyClick(job.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary/90"
                    >
                      <FiExternalLink className="h-3.5 w-3.5" />
                      Apply
                    </a>
                  </td>
                </tr>
              ))}
              {sortedJobs.length === 0 && (
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
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <FiClock className="h-4 w-4 text-violet-500" />
            <span className="text-sm font-semibold text-slate-700">
              Experience Range
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">
              Sort by Posted Date
            </span>
            <select
              value={postedDateSort}
              onChange={(e) => setPostedDateSort(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none transition duration-200 hover:border-slate-300 hover:bg-white focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        <div className="flex min-w-52 items-center gap-2">
          <input
            type="number"
            min="0"
            step="0.5"
            value={experienceRange.min}
            onChange={(e) =>
              setExperienceRange((prev) => ({ ...prev, min: e.target.value }))
            }
            placeholder="Min yrs"
            className="h-10 w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none transition duration-200 hover:border-slate-300 hover:bg-white focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
          />
          <span className="text-sm font-semibold text-slate-500">to</span>
          <input
            type="number"
            min="0"
            step="0.5"
            value={experienceRange.max}
            onChange={(e) =>
              setExperienceRange((prev) => ({ ...prev, max: e.target.value }))
            }
            placeholder="Max yrs"
            className="h-10 w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none transition duration-200 hover:border-slate-300 hover:bg-white focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </section>

      {content}
    </div>
  );
}
