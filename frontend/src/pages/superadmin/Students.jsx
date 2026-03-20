import { useEffect, useMemo, useState } from "react";
import { FiDownload } from "react-icons/fi";
import StudentsTable from "../../components/admin/StudentsTable";
import {
  addFavoriteStudents,
  removeFavoriteStudents,
  listFavoriteStudents,
  listStudents,
} from "../../services/adminService";
import { showError } from "../../utils/alerts";

function normalizeCtc(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function Students() {
  const [rows, setRows] = useState([]);
  const [currentCtcFilter, setCurrentCtcFilter] = useState("");
  const [totalExperienceFilter, setTotalExperienceFilter] = useState("");
  const [resumeFilter, setResumeFilter] = useState(""); // "" | "has" | "no"
  const [dateSort, setDateSort] = useState("newest"); // "newest" | "oldest"
  const [favoriteStudentIds, setFavoriteStudentIds] = useState([]);

  useEffect(() => {
    Promise.all([listStudents(), listFavoriteStudents()])
      .then(([students, favoriteIds]) => {
        setRows(Array.isArray(students) ? students : []);
        setFavoriteStudentIds(Array.isArray(favoriteIds) ? favoriteIds : []);
      })
      .catch(async (error) => {
        setRows([]);
        setFavoriteStudentIds([]);
        await showError(error?.message || "Failed to load students");
      });
  }, []);

  const mapped = useMemo(
    () =>
      rows.map((r) => ({
        id: r.id,
        fullName: r.full_name || r.fullName,
        email: r.email,
        location: r.location,
        phone: r.phone,
        isEligible: r.is_eligible || r.isEligible,
        eligibleUntil: r.eligible_until || r.eligibleUntil,
        resumeUrl:
          r.recent_application_resume_url ||
          r.resume_url ||
          r.resumeUrl ||
          null,
        currentCtc:
          r.recent_application_current_ctc ??
          r.current_ctc ??
          r.currentCtc ??
          null,
        expectedCtc:
          r.recent_application_expected_ctc ??
          r.expected_ctc ??
          r.expectedCtc ??
          null,
        totalExperience:
          r.experience_years ??
          r.experienceYears ??
          r.total_experience ??
          r.totalExperience ??
          null,
        updatedAt: r.updated_at || r.updatedAt || null,
      })),
    [rows],
  );

  const currentCtcOptions = useMemo(() => {
    const values = new Set();
    mapped.forEach((row) => {
      const value = normalizeCtc(row.currentCtc);
      if (value !== null) values.add(value);
    });
    return [...values].sort((a, b) => a - b);
  }, [mapped]);

  const totalExperienceOptions = useMemo(() => {
    const values = new Set();
    mapped.forEach((row) => {
      const value = String(row.totalExperience ?? "").trim();
      if (value) values.add(value);
    });
    return [...values].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
    );
  }, [mapped]);

  const filteredRows = useMemo(() => {
    const filtered = mapped.filter((row) => {
      const rowCurrent = normalizeCtc(row.currentCtc);
      const rowTotalExperience = String(row.totalExperience ?? "").trim();
      const hasResume = Boolean(String(row.resumeUrl ?? "").trim());

      if (currentCtcFilter !== "" && rowCurrent !== Number(currentCtcFilter)) {
        return false;
      }

      if (
        totalExperienceFilter !== "" &&
        rowTotalExperience !== totalExperienceFilter
      ) {
        return false;
      }

      if (resumeFilter === "has" && !hasResume) return false;
      if (resumeFilter === "no" && hasResume) return false;

      return true;
    });

    const toTime = (value) => {
      const parsed = Date.parse(value || "");
      return Number.isFinite(parsed) ? parsed : 0;
    };

    return filtered.sort((a, b) => {
      const aTime = toTime(a.updatedAt);
      const bTime = toTime(b.updatedAt);
      return dateSort === "oldest" ? aTime - bTime : bTime - aTime;
    });
  }, [mapped, currentCtcFilter, totalExperienceFilter, resumeFilter, dateSort]);

  const toggleFavorite = async (id) => {
    try {
      const isFav = favoriteStudentIds.includes(id);
      if (isFav) {
        const next = await removeFavoriteStudents([id]);
        setFavoriteStudentIds(Array.isArray(next) ? next : []);
      } else {
        const next = await addFavoriteStudents([id]);
        setFavoriteStudentIds(Array.isArray(next) ? next : []);
      }
    } catch (error) {
      await showError(error?.message || "Failed to update favourite students");
    }
  };

  const exportFilteredCsv = () => {
    if (filteredRows.length === 0) {
      showError("No filtered students available to export");
      return;
    }

    const csvEscape = (value) => {
      const text = String(value ?? "");
      if (text.includes('"') || text.includes(",") || text.includes("\n")) {
        return `"${text.replaceAll('"', '""')}"`;
      }
      return text;
    };

    const headers = [
      "Name",
      "Email",
      "Location",
      "Phone",
      "Eligibility",
      "Current CTC (in LPA)",
      "Expected CTC (in LPA)",
      "Total Experience",
      "Resume URL",
    ];

    const lines = [headers.map(csvEscape).join(",")];

    filteredRows.forEach((row) => {
      let eligibility = "Not eligible";
      if (row.isEligible) {
        const eligibleUntilText = row.eligibleUntil
          ? ` until ${new Date(row.eligibleUntil).toLocaleDateString()}`
          : "";
        eligibility = `Eligible${eligibleUntilText}`;
      }

      lines.push(
        [
          row.fullName || "Student",
          row.email || "",
          row.location || "",
          row.phone || "",
          eligibility,
          row.currentCtc ?? "",
          row.expectedCtc ?? "",
          row.totalExperience ?? "",
          row.resumeUrl || "",
        ]
          .map(csvEscape)
          .join(","),
      );
    });

    const blob = new Blob([`${lines.join("\n")}\n`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "superadmin-students-filtered.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Current CTC (in LPA)
            </span>
            <select
              value={currentCtcFilter}
              onChange={(event) => setCurrentCtcFilter(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary"
            >
              <option value="">All</option>
              {currentCtcOptions.map((value) => (
                <option key={`current-${value}`} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Total Experience
            </span>
            <select
              value={totalExperienceFilter}
              onChange={(event) => setTotalExperienceFilter(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary"
            >
              <option value="">All</option>
              {totalExperienceOptions.map((value) => (
                <option key={`experience-${value}`} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Resume
            </span>
            <select
              value={resumeFilter}
              onChange={(event) => setResumeFilter(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary"
            >
              <option value="">All</option>
              <option value="has">Has resume</option>
              <option value="no">No resume</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Sort By
            </span>
            <select
              value={dateSort}
              onChange={(event) => setDateSort(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </label>

          <div className="flex items-end">
            <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2">
              <button
                type="button"
                onClick={exportFilteredCsv}
                disabled={filteredRows.length === 0}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiDownload className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </section>

      <StudentsTable
        rows={filteredRows}
        favoriteRowIds={favoriteStudentIds}
        onToggleFavorite={toggleFavorite}
      />
    </div>
  );
}
