import { useEffect, useMemo, useState } from "react";
import { FiBarChart2, FiBriefcase, FiTrendingUp } from "react-icons/fi";
import Loader from "../../components/common/Loader";
import { listAllExternalJobs } from "../../services/externalJobService";
import { showError } from "../../utils/alerts";

const cardClass = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm";

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function parseExperienceBounds(value) {
  const raw = String(value || "").toLowerCase().trim();
  if (!raw) return null;

  const matchedNumbers = raw.match(/\d+(?:\.\d+)?/g);
  if (!matchedNumbers?.length) return null;

  const numbers = matchedNumbers
    .map(Number)
    .filter((item) => Number.isFinite(item));

  if (!numbers.length) return null;

  let min = numbers[0];
  let max = numbers.length > 1 ? numbers[1] : numbers[0];

  if (numbers.length === 1) {
    if (/\+|above|over|more than|minimum|min/.test(raw)) {
      max = Number.POSITIVE_INFINITY;
    }
    if (/up\s*to|upto|below|less than|under|maximum|max/.test(raw)) {
      min = 0;
    }
  }

  if (min > max) {
    const temp = min;
    min = max;
    max = temp;
  }

  return { min, max };
}

function matchesExperienceRange({ experienceValue, minValue, maxValue }) {
  const hasMin = Number.isFinite(minValue);
  const hasMax = Number.isFinite(maxValue);

  if (!hasMin && !hasMax) return true;

  const bounds = parseExperienceBounds(experienceValue);
  if (bounds) {
    if (hasMin && bounds.max < minValue) return false;
    if (hasMax && bounds.min > maxValue) return false;
    return true;
  }

  return false;
}

function matchesClicksRange(clicksFilter, clickCount) {
  if (clicksFilter === "0") return clickCount === 0;
  if (clicksFilter === "1-5") return clickCount >= 1 && clickCount <= 5;
  if (clicksFilter === "6-10") return clickCount >= 6 && clickCount <= 10;
  if (clicksFilter === "11+") return clickCount >= 11;
  return true;
}

export default function SuperAdminExternalJobAnalytics() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [minExperience, setMinExperience] = useState("");
  const [maxExperience, setMaxExperience] = useState("");
  const [clicksFilter, setClicksFilter] = useState("all");

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await listAllExternalJobs();
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      await showError(
        err?.message || "Failed to load external job analytics",
        "Analytics Error",
      );
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      const aCount = Number(a?.apply_click_count || 0);
      const bCount = Number(b?.apply_click_count || 0);
      if (bCount !== aCount) return bCount - aCount;
      return (
        new Date(b?.created_at || 0).getTime() -
        new Date(a?.created_at || 0).getTime()
      );
    });
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const minValue = minExperience === "" ? Number.NaN : Number(minExperience);
    const maxValue = maxExperience === "" ? Number.NaN : Number(maxExperience);

    return sortedJobs.filter((job) => {
      const experienceValue = String(job?.experience || "").trim();
      const clickCount = Number(job?.apply_click_count || 0);

      const experienceMatched = matchesExperienceRange({
        experienceValue,
        minValue,
        maxValue,
      });
      const clicksMatched = matchesClicksRange(clicksFilter, clickCount);

      return experienceMatched && clicksMatched;
    });
  }, [sortedJobs, minExperience, maxExperience, clicksFilter]);

  const totalClicks = useMemo(
    () =>
      filteredJobs.reduce(
        (sum, job) => sum + Number(job?.apply_click_count || 0),
        0,
      ),
    [filteredJobs],
  );

  const topJob = filteredJobs[0] || null;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              External Job Click Analytics
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Track which external jobs students are most interested in based on
              Apply clicks.
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className={cardClass}>
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
            <FiBriefcase className="h-4 w-4" />
            External Jobs
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {filteredJobs.length}
          </div>
        </div>

        <div className={cardClass}>
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
            <FiBarChart2 className="h-4 w-4" />
            Total Apply Clicks
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {totalClicks}
          </div>
        </div>

        <div className={cardClass}>
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
            <FiTrendingUp className="h-4 w-4" />
            Most Clicked Job
          </div>
          <div className="mt-2 text-base font-semibold text-slate-900">
            {topJob
              ? `${topJob.job_role || "-"} @ ${topJob.company || "-"}`
              : "-"}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {topJob
              ? `${Number(topJob.apply_click_count || 0)} clicks`
              : "No click data yet"}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8">
            <Loader label="Loading analytics..." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3">
              <div className="grid gap-3 md:grid-cols-4">
                <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <span>Min Experience (Years)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={minExperience}
                    onChange={(e) => setMinExperience(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-700 outline-none transition focus:border-primary"
                    placeholder="e.g. 2"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <span>Max Experience (Years)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={maxExperience}
                    onChange={(e) => setMaxExperience(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-700 outline-none transition focus:border-primary"
                    placeholder="e.g. 5"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <span>Clicks</span>
                  <select
                    value={clicksFilter}
                    onChange={(e) => setClicksFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-700 outline-none transition focus:border-primary"
                  >
                    <option value="all">All clicks</option>
                    <option value="0">0 clicks</option>
                    <option value="1-5">1 to 5 clicks</option>
                    <option value="6-10">6 to 10 clicks</option>
                    <option value="11+">11+ clicks</option>
                  </select>
                </label>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      setMinExperience("");
                      setMaxExperience("");
                      setClicksFilter("all");
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            </div>

            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Job Title</th>
                  <th className="px-4 py-3">Experience</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Clicks</th>
                  <th className="px-4 py-3">Last Clicked</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job, idx) => (
                  <tr key={job.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {job.company || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-900">
                      {job.job_role || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {job.experience || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {job.location || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-900">
                      {Number(job.apply_click_count || 0)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDateTime(job.last_clicked_at)}
                    </td>
                  </tr>
                ))}

                {filteredJobs.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No external jobs found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
