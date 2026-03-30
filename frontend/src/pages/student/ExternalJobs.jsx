// FILE: src/pages/student/ExternalJobs.jsx
// Route: /student/external-jobs

import { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  FiExternalLink,
  FiRefreshCw,
  FiBriefcase,
  FiMapPin,
  FiCalendar,
  FiSearch,
  FiShare2,
  FiCheckSquare,
  FiSquare,
  FiX,
  FiMessageCircle,
} from "react-icons/fi";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  listActiveExternalJobs,
  listPublicActiveExternalJobs,
  trackExternalJobsVisit,
  trackExternalJobClick,
  trackExternalJobShare,
  trackPublicExternalJobClick,
  trackPublicExternalJobsVisit,
} from "../../services/externalJobService";
import { showError } from "../../utils/alerts";
import Loader from "../../components/common/Loader";
import { useAuth } from "../../context/authStore";

const EXPERIENCE_CAPSULES = [
  "0-1",
  "2-3",
  "4-5",
  "6-7",
  "8-9",
  "9-10",
  "10+",
  "NA",
];

const SKILL_CAPSULES = [
  "DevOps",
  "CI/CD",
  "AWS",
  "Azure",
  "GCP",
  "Terraform",
  "Kubernetes",
  "Docker",
  "Jenkins",
  "Ansible",
  "Bash",
  "Prometheus",
  "Grafana",
  // "ELK Stack",
  "GitHub",
  "GitLab",
];

const DATE_FILTERS = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "last3", label: "Last 3 days" },
  { key: "last7", label: "Last 7 days" },
];

function canonicalSkill(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "");
}

function parseSkills(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/[,;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseExperienceRange(value) {
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
}

function parseCapsuleRange(value) {
  if (String(value).endsWith("+")) {
    const min = Number(value.replace("+", ""));
    return Number.isFinite(min) ? { min, max: Number.POSITIVE_INFINITY } : null;
  }

  const [minText, maxText] = String(value || "").split("-");
  const min = Number(minText);
  const max = Number(maxText);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { min, max };
}

function isNAExperience(value) {
  const text = String(value || "")
    .trim()
    .toLowerCase();

  return (
    text === "" ||
    text === "na" ||
    text === "n/a" ||
    text === "not available" ||
    text === "not applicable" ||
    text === "none" ||
    text === "-"
  );
}

function getJobTimestamp(job) {
  const value = job?.created_at || null;
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function getJobDayDifference(job) {
  const time = getJobTimestamp(job);
  if (!time) return Number.POSITIVE_INFINITY;

  const posted = new Date(time);
  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfPosted = new Date(
    posted.getFullYear(),
    posted.getMonth(),
    posted.getDate(),
  );

  return Math.floor(
    (startOfToday.getTime() - startOfPosted.getTime()) / (1000 * 60 * 60 * 24),
  );
}

function getJobAgeInHours(job) {
  const time = getJobTimestamp(job);
  if (!time) return Number.POSITIVE_INFINITY;
  return Math.max(0, (Date.now() - time) / (1000 * 60 * 60));
}

function formatPostedDayLabel(job) {
  const dayDiff = getJobDayDifference(job);
  if (!Number.isFinite(dayDiff)) return "Unknown";

  if (dayDiff <= 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  return `${dayDiff} days ago`;
}

function getFreshness(job) {
  const ageHours = getJobAgeInHours(job);
  if (ageHours <= 24) {
    return {
      dotClass: "bg-emerald-500",
      textClass: "text-emerald-700",
    };
  }

  if (ageHours <= 72) {
    return {
      dotClass: "bg-amber-500",
      textClass: "text-amber-700",
    };
  }

  return {
    dotClass: "bg-rose-500",
    textClass: "text-rose-700",
  };
}

function getOrCreateVisitorToken() {
  const key = "externalJobsVisitorToken";
  let token = localStorage.getItem(key);
  if (!token) {
    token =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(key, token);
  }
  return token;
}

export default function ExternalJobs({ publicView = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExperience, setSelectedExperience] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [selectedDateFilter, setSelectedDateFilter] = useState("all");
  const [postedDateSort, setPostedDateSort] = useState("desc");
  const [copiedJobId, setCopiedJobId] = useState(null);
  const [selectedJobIds, setSelectedJobIds] = useState([]);
  const [isMultiCopied, setIsMultiCopied] = useState(false);

  const trackingMeta = useMemo(
    () => ({
      ref: searchParams.get("ref") || null,
      utm_source: searchParams.get("utm_source") || null,
      utm_medium: searchParams.get("utm_medium") || null,
      utm_campaign: searchParams.get("utm_campaign") || null,
      visitor_token: getOrCreateVisitorToken(),
      landing_path: `${globalThis.location.pathname}${globalThis.location.search}`,
    }),
    [searchParams],
  );

  const highlightedJobId = searchParams.get("jobId") || null;
  const sharedJobIdsFromUrl = useMemo(() => {
    const fromMany = String(searchParams.get("jobIds") || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    const fromSingle = highlightedJobId ? [highlightedJobId] : [];
    return Array.from(new Set([...fromMany, ...fromSingle]));
  }, [searchParams, highlightedJobId]);

  const toggleSelection = (value, setter) => {
    setter((previous) =>
      previous.includes(value)
        ? previous.filter((item) => item !== value)
        : [...previous, value],
    );
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const title = String(job?.job_role || "");
      const company = String(job?.company || "");
      const normalizedQuery = searchTerm.trim().toLowerCase();

      const searchMatched = !normalizedQuery
        ? true
        : title.toLowerCase().includes(normalizedQuery) ||
          company.toLowerCase().includes(normalizedQuery);

      if (!searchMatched) return false;

      const parsedExperience = parseExperienceRange(job?.experience);
      const experienceMatched =
        selectedExperience.length === 0
          ? true
          : (() => {
              const includesNA = selectedExperience.includes("NA");
              const numericCapsules = selectedExperience.filter(
                (capsule) => capsule !== "NA",
              );

              const numericMatched =
                parsedExperience && numericCapsules.length > 0
                  ? numericCapsules.some((capsule) => {
                      const range = parseCapsuleRange(capsule);
                      if (!range) return false;
                      return (
                        parsedExperience.max >= range.min &&
                        parsedExperience.min <= range.max
                      );
                    })
                  : false;

              const naMatched = includesNA && isNAExperience(job?.experience);
              return numericMatched || naMatched;
            })();

      if (!experienceMatched) return false;

      let dateMatched = true;
      if (selectedDateFilter !== "all") {
        const dayDiff = getJobDayDifference(job);
        if (!Number.isFinite(dayDiff)) return false;
        dateMatched =
          selectedDateFilter === "today"
            ? dayDiff === 0
            : selectedDateFilter === "last3"
              ? dayDiff >= 0 && dayDiff <= 2
              : selectedDateFilter === "last7"
                ? dayDiff >= 0 && dayDiff <= 6
                : true;
      }

      if (!dateMatched) return false;

      const selectedSkillSet = new Set(selectedSkills.map(canonicalSkill));
      if (selectedSkillSet.size === 0) return true;

      const jobSkills = parseSkills(job?.skills).map(canonicalSkill);
      if (!jobSkills.length) {
        return false;
      }

      return jobSkills.some((skill) => selectedSkillSet.has(skill));
    });
  }, [
    jobs,
    searchTerm,
    selectedExperience,
    selectedSkills,
    selectedDateFilter,
  ]);

  const sortedJobs = useMemo(() => {
    return [...filteredJobs].sort((a, b) => {
      if (highlightedJobId) {
        if (
          String(a?.id) === highlightedJobId &&
          String(b?.id) !== highlightedJobId
        )
          return -1;
        if (
          String(b?.id) === highlightedJobId &&
          String(a?.id) !== highlightedJobId
        )
          return 1;
      }

      const aTime = getJobTimestamp(a);
      const bTime = getJobTimestamp(b);
      return postedDateSort === "asc" ? aTime - bTime : bTime - aTime;
    });
  }, [filteredJobs, postedDateSort, highlightedJobId]);

  const isSharedSelectionView = Boolean(sharedJobIdsFromUrl.length > 0);

  const visibleJobs = useMemo(() => {
    if (!isSharedSelectionView) return sortedJobs;
    const selectedSet = new Set(sharedJobIdsFromUrl);
    return sortedJobs.filter((job) => selectedSet.has(String(job?.id)));
  }, [isSharedSelectionView, sortedJobs, sharedJobIdsFromUrl]);

  const selectedJobs = useMemo(() => {
    if (!selectedJobIds.length) return [];
    const selectedSet = new Set(selectedJobIds.map(String));
    return jobs.filter((job) => selectedSet.has(String(job?.id)));
  }, [selectedJobIds, jobs]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = publicView
        ? await listPublicActiveExternalJobs()
        : await listActiveExternalJobs();
      setJobs(data);
    } catch (err) {
      await showError(err?.message || "Failed to load jobs");
    } finally {
      setIsLoading(false);
    }
  }, [publicView]);

  useEffect(() => {
    if (!jobs.length) return;
    const availableIds = new Set(jobs.map((job) => String(job?.id)));
    setSelectedJobIds((previous) =>
      previous.filter((id) => availableIds.has(String(id))),
    );
  }, [jobs]);

  useEffect(() => {
    if (publicView) {
      trackPublicExternalJobsVisit(trackingMeta).catch(() => {});
    } else {
      trackExternalJobsVisit().catch(() => {});
    }
    refresh().catch(() => {});
  }, [publicView, trackingMeta, refresh]);

  const buildShareUrl = (jobIdsInput, shareChannel) => {
    const ids = Array.isArray(jobIdsInput)
      ? jobIdsInput.map(String).filter(Boolean)
      : [String(jobIdsInput || "")].filter(Boolean);

    const url = new URL(`${globalThis.location.origin}/external-jobs`);
    if (ids.length === 1) {
      url.searchParams.set("jobId", ids[0]);
    } else if (ids.length > 1) {
      url.searchParams.set("jobIds", ids.join(","));
    }

    if (user?.id) {
      url.searchParams.set("ref", user.id);
    }
    url.searchParams.set("utm_source", "job_share");
    url.searchParams.set("utm_medium", shareChannel);
    url.searchParams.set("utm_campaign", "external_jobs_viral");
    return url.toString();
  };

  const trackShare = async (jobId, shareChannel) => {
    if (publicView || !user?.id) return;
    await trackExternalJobShare(jobId, {
      share_channel: shareChannel,
      ref: user.id,
      utm_source: "job_share",
      utm_medium: shareChannel,
      utm_campaign: "external_jobs_viral",
      visitor_token: trackingMeta.visitor_token,
      landing_path: `${globalThis.location.pathname}${globalThis.location.search}`,
    }).catch(() => {});
  };

  const onApplyClick = (jobId) => {
    // Fire and forget so navigation is instant while analytics is captured.
    if (publicView) {
      trackPublicExternalJobClick(jobId, trackingMeta).catch(() => {});
      return;
    }

    trackExternalJobClick(jobId, trackingMeta).catch(() => {});
  };

  const toggleJobMultiSelect = (jobId) => {
    const id = String(jobId);
    setSelectedJobIds((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    );
  };

  const clearSelectedJobs = () => {
    setSelectedJobIds([]);
    setIsMultiCopied(false);
  };

  const onCopySelectedShareLink = async () => {
    if (!selectedJobs.length) return;

    const selectedIds = selectedJobs.map((job) => String(job.id));
    const shareUrl = buildShareUrl(selectedIds, "copy_link_multi");
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsMultiCopied(true);
      setTimeout(() => setIsMultiCopied(false), 1500);
      selectedIds.forEach((id) => {
        trackShare(id, "copy_link_multi").catch(() => {});
      });
    } catch {
      await showError("Unable to copy multi-job link");
    }
  };

  const onQuickShareSelected = async () => {
    if (!selectedJobs.length) return;

    const selectedIds = selectedJobs.map((job) => String(job.id));
    const shareUrl = buildShareUrl(selectedIds, "native_multi");

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${selectedJobs.length} External Jobs`,
          text: `Check these ${selectedJobs.length} job opportunities`,
          url: shareUrl,
        });

        selectedIds.forEach((id) => {
          trackShare(id, "native_multi").catch(() => {});
        });
        return;
      } catch {
        return;
      }
    }

    await onCopySelectedShareLink();
  };

  const onWhatsAppShareSelected = async () => {
    if (!selectedJobs.length) return;

    const selectedIds = selectedJobs.map((job) => String(job.id));
    const shareUrl = buildShareUrl(selectedIds, "whatsapp_multi");
    const rolesPreview = selectedJobs
      .slice(0, 3)
      .map((job) => `${job.job_role || "Role"} @ ${job.company || "Company"}`)
      .join("\n");
    const extraCount = Math.max(0, selectedJobs.length - 3);
    const text = encodeURIComponent(
      `Check these ${selectedJobs.length} jobs:\n${rolesPreview}${
        extraCount ? `\n+${extraCount} more` : ""
      }\n\n${shareUrl}`,
    );

    globalThis.open(
      `https://wa.me/?text=${text}`,
      "_blank",
      "noopener,noreferrer",
    );

    selectedIds.forEach((id) => {
      trackShare(id, "whatsapp_multi").catch(() => {});
    });
  };

  const onQuickShare = async (job) => {
    const shareUrl = buildShareUrl(job.id, "card_share");
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${job.job_role || "Job"} at ${job.company || "Company"}`,
          text: `Check this job: ${job.job_role || "Opportunity"}`,
          url: shareUrl,
        });
        await trackShare(job.id, "card_share");
        return;
      } catch {
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedJobId(String(job.id));
      setTimeout(() => setCopiedJobId(null), 1500);
      await trackShare(job.id, "card_share_copy");
    } catch {
      await showError("Unable to share this job");
    }
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
      <section className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {visibleJobs.map((job) => {
            const freshness = getFreshness(job);
            const titleText = job.job_role || "-";
            const companyText = job.company || "-";
            const experienceText = isNAExperience(job?.experience)
              ? "NA"
              : String(job?.experience || "NA").trim();

            return (
              <article
                key={job.id}
                className={`group overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100/60 ${
                  selectedJobIds.includes(String(job.id)) && !publicView
                    ? "ring-2 ring-blue-400"
                    : ""
                } ${
                  sharedJobIdsFromUrl.includes(String(job.id))
                    ? "ring-2 ring-blue-300"
                    : ""
                }`}
              >
                <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400" />

                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-2">
                    {!publicView && (
                      <button
                        type="button"
                        onClick={() => toggleJobMultiSelect(job.id)}
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition ${
                          selectedJobIds.includes(String(job.id))
                            ? "border-blue-300 bg-blue-50 text-blue-700"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {selectedJobIds.includes(String(job.id)) ? (
                          <FiCheckSquare className="h-3.5 w-3.5 text-blue-600" />
                        ) : (
                          <FiSquare className="h-3.5 w-3.5" />
                        )}
                        Select
                      </button>
                    )}

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${freshness.textClass} ${
                        freshness.textClass.includes("emerald")
                          ? "border-emerald-200 bg-emerald-50"
                          : freshness.textClass.includes("amber")
                            ? "border-amber-200 bg-amber-50"
                            : "border-rose-200 bg-rose-50"
                      }`}
                    >
                      <FiCalendar className="h-3 w-3 text-slate-500" />
                      {formatPostedDayLabel(job)}
                    </span>
                  </div>

                  <div>
                    <h2
                      className="truncate text-[15px] font-bold leading-5 text-slate-900"
                      title={titleText}
                    >
                      {titleText}
                    </h2>

                    <p
                      className="mt-1 truncate text-sm font-semibold text-slate-600"
                      title={companyText}
                    >
                      {companyText}
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm text-slate-600">
                    <p className="inline-flex items-center gap-1.5">
                      <FiMapPin className="h-3.5 w-3.5 text-blue-500" />
                      <span className="truncate">{job.location || "-"}</span>
                    </p>
                    <p className="inline-flex items-center gap-1.5">
                      <FiBriefcase className="h-3.5 w-3.5 text-violet-500" />
                      Experience: {experienceText}
                    </p>
                  </div>

                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <a
                      href={job.apply_link}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => onApplyClick(job.id)}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700"
                    >
                      <FiExternalLink className="h-3.5 w-3.5" />
                      Apply Now
                    </a>

                    {!publicView && (
                      <button
                        type="button"
                        onClick={() => onQuickShare(job)}
                        className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-blue-700 transition hover:border-blue-300"
                        title={
                          copiedJobId === String(job.id)
                            ? "Link copied"
                            : "Share this job"
                        }
                        aria-label={
                          copiedJobId === String(job.id)
                            ? "Link copied"
                            : "Share this job"
                        }
                      >
                        <FiShare2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {visibleJobs.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            {isSharedSelectionView
              ? "This shared job is no longer available."
              : "No jobs found for the selected filters."}
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-lg font-bold text-slate-900">
            External Job Opportunities
          </h1>
          <p className="text-sm text-slate-500">
            {publicView
              ? "Browse and share opportunities with your network."
              : "Here are jobs YOU should apply to TODAY."}
          </p>
          {isSharedSelectionView && (
            <p className="text-xs font-medium text-blue-700">
              Showing shared link: {visibleJobs.length} selected job
              {visibleJobs.length === 1 ? "" : "s"}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              Updated Today
            </span>
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
              100+ Jobs Added Daily
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!publicView && isSharedSelectionView && (
            <button
              type="button"
              onClick={() => navigate("/student/external-jobs")}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-300"
            >
              View All Jobs
            </button>
          )}

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
        </div>
      </section>

      {/* Filters */}
      {!publicView && selectedJobIds.length > 0 && (
        <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-slate-700 bg-blue-700 px-3 py-2 shadow-2xl ring-1 ring-black/10 backdrop-blur md:bottom-6 md:left-auto md:right-6 md:translate-x-0">
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-900">
            {selectedJobIds.length}
          </span>

          <button
            type="button"
            onClick={onWhatsAppShareSelected}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
            title="Share selected jobs on WhatsApp"
            aria-label="Share selected jobs on WhatsApp"
          >
            <FiMessageCircle className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onQuickShareSelected}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-blue-300 bg-blue-50 text-blue-700 transition hover:bg-blue-100"
            title={isMultiCopied ? "Link copied" : "Share selected jobs"}
            aria-label={isMultiCopied ? "Link copied" : "Share selected jobs"}
          >
            <FiShare2 className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={clearSelectedJobs}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-slate-700 transition hover:bg-slate-100"
            title="Clear selection"
            aria-label="Clear selection"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>
      )}

      {!isSharedSelectionView && (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-44 max-w-md flex-1">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by job title or company"
                className="h-8.5 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] font-medium text-slate-700 outline-none transition duration-200 hover:border-slate-300 hover:bg-white focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
              />
            </label>

            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
              <span className="text-[13px] font-semibold text-slate-600">
                Posted
              </span>
              <select
                value={postedDateSort}
                onChange={(e) => setPostedDateSort(e.target.value)}
                className="h-7 rounded-md border border-slate-200 bg-white px-2 text-[13px] font-semibold text-slate-700 outline-none transition hover:border-slate-300"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setSelectedExperience([]);
                setSelectedSkills([]);
                setSelectedDateFilter("all");
                setPostedDateSort("desc");
              }}
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[13px] font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
            >
              Clear Filters
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                Experience
              </p>
              <div className="flex flex-wrap gap-2">
                {EXPERIENCE_CAPSULES.map((item) => {
                  const active = selectedExperience.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        toggleSelection(item, setSelectedExperience)
                      }
                      className={`rounded-full border px-2.5 py-1 text-[12px] font-semibold transition ${
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                Date
              </p>
              <div className="flex flex-wrap gap-2">
                {DATE_FILTERS.map((item) => {
                  const active = selectedDateFilter === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setSelectedDateFilter(item.key)}
                      className={`rounded-full border px-2.5 py-1 text-[12px] font-semibold transition ${
                        active
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
              Tools
            </p>
            <div className="flex flex-wrap gap-2">
              {SKILL_CAPSULES.map((item) => {
                const active = selectedSkills.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleSelection(item, setSelectedSkills)}
                    className={`rounded-full border px-2.5 py-1 text-[12px] font-semibold transition ${
                      active
                        ? "border-sky-500 bg-sky-100 text-sky-700"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {content}
    </div>
  );
}

ExternalJobs.propTypes = {
  publicView: PropTypes.bool,
};
