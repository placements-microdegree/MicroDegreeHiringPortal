import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ApplicationsTable from "./ApplicationsTable";
import {
  listAllApplications,
  updateApplicationStatus,
} from "../../services/applicationService";
import { listJobs } from "../../services/jobService";

function getJobId(application) {
  return (
    application.job_id ||
    application.jobId ||
    application.job?.id ||
    application.jobs?.id ||
    null
  );
}

function getJobTitle(application) {
  return (
    application.job?.title ||
    application.jobs?.title ||
    application.jobTitle ||
    "Untitled Job"
  );
}

function normalizeJobStatus(status) {
  const value = String(status || "")
    .trim()
    .toLowerCase();
  if (value === "active") return "active";
  if (value === "deleted") return "deleted";
  return "unknown";
}

function getJobStatusChipClasses(status) {
  if (status === "active") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "deleted") {
    return "bg-rose-100 text-rose-700";
  }
  return "bg-slate-100 text-slate-700";
}

function formatPostedDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function mapApplicationRow(row, jobsById) {
  const resume =
    row.student?.resumes?.[0] ||
    row.profiles?.resumes?.[0] ||
    row.resumes?.[0] ||
    (Array.isArray(row.profiles?.resumes) ? row.profiles.resumes[0] : null);

  const jobId = getJobId(row);
  const jobFromLookup = jobId ? jobsById.get(String(jobId)) : null;
  const mergedJob = row.job
    ? { ...row.job, ...(jobFromLookup || {}) }
    : row.jobs
      ? { ...row.jobs, ...(jobFromLookup || {}) }
      : jobFromLookup || null;
  const jobTitle =
    mergedJob?.title || row.jobTitle || jobFromLookup?.title || "Untitled Job";
  const jobCompany = mergedJob?.company || row.company || "-";
  const student = row.student || row.profiles || null;

  return {
    ...row,
    job_id: row.job_id || row.jobId || jobId,
    job: mergedJob || null,
    jobs:
      mergedJob ||
      (jobId ? { id: jobId, title: jobTitle, company: jobCompany } : null),
    studentName: student?.full_name || row.studentName,
    studentPhone: student?.phone,
    studentEmail: student?.email,
    resumeUrl:
      resume?.signed_url ||
      resume?.file_url ||
      resume?.url ||
      resume?.public_url ||
      row.resumeUrl,
    jobTitle,
  };
}

export default function ManageApplicationsByJobView({
  basePath,
  selectedJobId,
}) {
  const [rows, setRows] = useState([]);
  const [jobs, setJobs] = useState([]);

  const refresh = async () => {
    const [all, allJobs] = await Promise.all([
      listAllApplications(),
      listJobs(),
    ]);
    setRows(all);
    setJobs(allJobs);
  };

  useEffect(() => {
    refresh();
  }, []);

  const onStatusChange = async (id, status) => {
    await updateApplicationStatus(id, status);
    await refresh();
  };

  const jobsById = useMemo(
    () => new Map((jobs || []).map((job) => [String(job.id), job])),
    [jobs],
  );

  const normalizedRows = useMemo(
    () => rows.map((row) => mapApplicationRow(row, jobsById)),
    [rows, jobsById],
  );

  const jobCards = useMemo(() => {
    const jobsMap = new Map();

    for (const row of normalizedRows) {
      const jobId = getJobId(row);
      if (!jobId) continue;

      const existing = jobsMap.get(jobId);
      if (!existing) {
        const jobStatus = normalizeJobStatus(
          row.jobs?.status || row.job?.status,
        );
        jobsMap.set(jobId, {
          id: jobId,
          title: getJobTitle(row),
          company: row.jobs?.company || row.company || "-",
          createdAt: row.jobs?.created_at || row.job?.created_at || null,
          status: jobStatus,
          applicationsCount: 1,
        });
        continue;
      }

      if (!existing.createdAt) {
        existing.createdAt =
          row.jobs?.created_at || row.job?.created_at || null;
      }
      if (existing.status === "unknown") {
        existing.status = normalizeJobStatus(
          row.jobs?.status || row.job?.status,
        );
      }
      existing.applicationsCount += 1;
    }

    return Array.from(jobsMap.values()).sort((a, b) =>
      a.title.localeCompare(b.title),
    );
  }, [normalizedRows]);

  if (!selectedJobId) {
    return (
      <div className="space-y-4">
        <div className="text-base font-semibold text-slate-900">
          Posted Jobs
        </div>
        {jobCards.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            No posted jobs with applications yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {jobCards.map((job) => (
              <Link
                key={job.id}
                to={`${basePath}/${job.id}`}
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-primary"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-base font-semibold text-slate-900">
                    {job.title}
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getJobStatusChipClasses(job.status)}`}
                  >
                    {job.status}
                  </span>
                </div>
                <div className="mt-1 text-sm text-slate-600">{job.company}</div>
                <div className="mt-1 text-xs font-medium text-slate-500">
                  Posted: {formatPostedDate(job.createdAt)}
                </div>
                <div className="mt-3 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {job.applicationsCount} Applied
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  const filteredRows = normalizedRows.filter(
    (row) => String(getJobId(row)) === String(selectedJobId),
  );

  const selectedJobTitle = filteredRows[0]?.jobTitle || "Job";

  return (
    <div className="space-y-4">
      <div>
        <Link
          to={basePath}
          className="text-sm font-semibold text-primary hover:underline"
        >
          Back to jobs
        </Link>
      </div>
      <div className="text-base font-semibold text-slate-900">
        Applied Candidates: {selectedJobTitle}
      </div>
      <ApplicationsTable rows={filteredRows} onStatusChange={onStatusChange} />
    </div>
  );
}
