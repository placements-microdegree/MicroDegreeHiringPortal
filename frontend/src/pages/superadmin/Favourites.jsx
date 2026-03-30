import { useEffect, useMemo, useState } from "react";
import { FiDownload, FiHeart } from "react-icons/fi";
import StudentsTable from "../../components/admin/StudentsTable";
import {
  listFavoriteStudents,
  listStudents,
  removeFavoriteStudents,
} from "../../services/adminService";
import { showError } from "../../utils/alerts";

const ACTIVE_WINDOW_DAYS = 7;

const CTC_BUCKETS = [
  { id: "0to2", label: "0 - 2 LPA", min: 0, max: 3 },
  { id: "3to5", label: "3 - 5 LPA", min: 3, max: 6 },
  { id: "6to8", label: "6 - 8 LPA", min: 6, max: 9 },
  { id: "9to11", label: "9 - 11 LPA", min: 9, max: 12 },
  { id: "12plus", label: "12+ LPA", min: 12, max: Number.POSITIVE_INFINITY },
];

const EXPERIENCE_BUCKETS = [
  { id: "0to1", label: "0 - 1 years", min: 0, max: 2 },
  { id: "2to3", label: "2 - 3 years", min: 2, max: 4 },
  { id: "4to5", label: "4 - 5 years", min: 4, max: 6 },
  { id: "6to7", label: "6 - 7 years", min: 6, max: 8 },
  { id: "8to9", label: "8 - 9 years", min: 8, max: 10 },
  { id: "10plus", label: "10+ years", min: 10, max: Number.POSITIVE_INFINITY },
];

function normalizeNumeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseExperienceYears(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value).toLowerCase();
  if (text.includes("fresher")) return 0;
  const numbers = text.match(/\d+(\.\d+)?/g);
  if (!numbers || numbers.length === 0) return null;
  const first = Number(numbers[0]);
  return Number.isFinite(first) ? first : null;
}

function belongsToAnyBucket(value, selectedBucketIds, buckets) {
  if (!selectedBucketIds.length) return true;
  if (value === null || value === undefined) return false;

  return selectedBucketIds.some((bucketId) => {
    const bucket = buckets.find((item) => item.id === bucketId);
    if (!bucket) return false;
    return value >= bucket.min && value < bucket.max;
  });
}

function isRecentlyActive(lastActiveAt) {
  if (!lastActiveAt) return false;
  const time = new Date(lastActiveAt).getTime();
  if (!Number.isFinite(time)) return false;
  const diffDays = (Date.now() - time) / (24 * 60 * 60 * 1000);
  return diffDays <= ACTIVE_WINDOW_DAYS;
}

function toggleSelection(prev, id) {
  return prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
}

export default function Favourites() {
  const [rows, setRows] = useState([]);
  const [favoriteStudentIds, setFavoriteStudentIds] = useState([]);
  const [selectedFavoriteStudentIds, setSelectedFavoriteStudentIds] = useState(
    [],
  );
  const [selectedCtcBuckets, setSelectedCtcBuckets] = useState([]);
  const [selectedExperienceBuckets, setSelectedExperienceBuckets] = useState([]);
  const [locationFilter, setLocationFilter] = useState("");
  const [preferredLocationFilter, setPreferredLocationFilter] = useState("");
  const [resumeFilter, setResumeFilter] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);

  useEffect(() => {
    Promise.all([listStudents(), listFavoriteStudents()])
      .then(([students, favoriteIds]) => {
        setRows(Array.isArray(students) ? students : []);
        setFavoriteStudentIds(Array.isArray(favoriteIds) ? favoriteIds : []);
      })
      .catch(async (error) => {
        setRows([]);
        setFavoriteStudentIds([]);
        await showError(error?.message || "Failed to load favourite students");
      });
  }, []);

  const mapped = useMemo(
    () =>
      rows.map((r) => ({
        id: r.id,
        fullName: r.full_name || r.fullName,
        email: r.email,
        location: r.location,
        preferredLocation: r.preferred_location || r.preferredLocation || "",
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
          r.recent_application_total_experience ??
          r.experience_years ??
          r.experienceYears ??
          r.total_experience ??
          r.totalExperience ??
          null,
        updatedAt: r.updated_at || r.updatedAt || null,
        lastActiveAt: r.last_active_at || r.lastActiveAt || null,
      })),
    [rows],
  );

  const favoriteRows = useMemo(() => {
    const favoriteSet = new Set(favoriteStudentIds);
    return mapped.filter((row) => favoriteSet.has(row.id));
  }, [mapped, favoriteStudentIds]);

  const locationOptions = useMemo(() => {
    const values = new Set();
    favoriteRows.forEach((row) => {
      const value = String(row.location ?? "").trim();
      if (value) values.add(value);
    });
    return [...values].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
    );
  }, [favoriteRows]);

  const preferredLocationOptions = useMemo(() => {
    const values = new Set();
    favoriteRows.forEach((row) => {
      const value = String(row.preferredLocation ?? "").trim();
      if (value) values.add(value);
    });
    return [...values].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
    );
  }, [favoriteRows]);

  const filteredFavoriteRows = useMemo(() => {
    const baseRows = activeOnly
      ? favoriteRows.filter((row) => isRecentlyActive(row.lastActiveAt))
      : favoriteRows;

    return baseRows.filter((row) => {
      const rowCurrent = normalizeNumeric(row.currentCtc);
      const rowExperience = parseExperienceYears(row.totalExperience);
      const hasResume = Boolean(String(row.resumeUrl ?? "").trim());

      if (!belongsToAnyBucket(rowCurrent, selectedCtcBuckets, CTC_BUCKETS)) {
        return false;
      }
      if (!belongsToAnyBucket(rowExperience, selectedExperienceBuckets, EXPERIENCE_BUCKETS)) {
        return false;
      }
      if (locationFilter && String(row.location || "") !== locationFilter) return false;
      if (
        preferredLocationFilter &&
        String(row.preferredLocation || "") !== preferredLocationFilter
      ) {
        return false;
      }
      if (resumeFilter === "has" && !hasResume) return false;
      if (resumeFilter === "no" && hasResume) return false;
      return true;
    });
  }, [
    favoriteRows,
    activeOnly,
    selectedCtcBuckets,
    selectedExperienceBuckets,
    locationFilter,
    preferredLocationFilter,
    resumeFilter,
  ]);

  const activeFavoriteCount = useMemo(
    () => favoriteRows.filter((row) => isRecentlyActive(row.lastActiveAt)).length,
    [favoriteRows],
  );

  const baseCountBeforeFilters = useMemo(
    () => (activeOnly ? activeFavoriteCount : favoriteRows.length),
    [activeOnly, activeFavoriteCount, favoriteRows.length],
  );

  const toggleFavoriteSelection = (id, checked) => {
    setSelectedFavoriteStudentIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return [...next];
    });
  };

  const toggleAllFavorites = (checked) => {
    if (!checked) {
      setSelectedFavoriteStudentIds([]);
      return;
    }

    setSelectedFavoriteStudentIds(
      filteredFavoriteRows.map((row) => row.id).filter(Boolean),
    );
  };

  const removeSelectedFromFavorites = async () => {
    if (selectedFavoriteStudentIds.length === 0) {
      await showError("Select at least one favourite student to remove");
      return;
    }

    try {
      const nextFavoriteIds = await removeFavoriteStudents(
        selectedFavoriteStudentIds,
      );
      setFavoriteStudentIds(
        Array.isArray(nextFavoriteIds) ? nextFavoriteIds : [],
      );
      setSelectedFavoriteStudentIds([]);
    } catch (error) {
      await showError(error?.message || "Failed to remove favourite students");
    }
  };

  const exportFilteredCsv = () => {
    if (filteredFavoriteRows.length === 0) {
      showError("No favourite students available to export");
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
      "Preferred Location",
      "Phone",
      "Eligibility",
      "Current CTC (in LPA)",
      "Expected CTC (in LPA)",
      "Total Experience",
      "Profile Updated At",
      "Last Active",
      "Resume URL",
    ];

    const lines = [headers.map(csvEscape).join(",")];

    filteredFavoriteRows.forEach((row) => {
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
          row.preferredLocation || "",
          row.phone || "",
          eligibility,
          row.currentCtc ?? "",
          row.expectedCtc ?? "",
          row.totalExperience ?? "",
          row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "",
          row.lastActiveAt ? new Date(row.lastActiveAt).toLocaleString() : "",
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
    link.download = "superadmin-favourite-students.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm">
        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
            All Favourites: <span className="font-semibold text-slate-900">{favoriteRows.length}</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
            Active (last {ACTIVE_WINDOW_DAYS} days): <span className="font-semibold text-slate-900">{activeFavoriteCount}</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
            Before Filters: <span className="font-semibold text-slate-900">{baseCountBeforeFilters}</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
            After Filters: <span className="font-semibold text-slate-900">{filteredFavoriteRows.length}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(event) => setActiveOnly(event.target.checked)}
            />
            Active Students Only
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Location
            </span>
            <select
              value={locationFilter}
              onChange={(event) => setLocationFilter(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary"
            >
              <option value="">All</option>
              {locationOptions.map((value) => (
                <option key={`fav-location-${value}`} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Preferred Location
            </span>
            <select
              value={preferredLocationFilter}
              onChange={(event) => setPreferredLocationFilter(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary"
            >
              <option value="">All</option>
              {preferredLocationOptions.map((value) => (
                <option key={`fav-preferred-location-${value}`} value={value}>
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

          <div className="flex items-end">
            <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2">
              <button
                type="button"
                onClick={removeSelectedFromFavorites}
                disabled={selectedFavoriteStudentIds.length === 0}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiHeart className="h-4 w-4" />
                Remove Selected
              </button>
              <button
                type="button"
                onClick={exportFilteredCsv}
                disabled={filteredFavoriteRows.length === 0}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiDownload className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Experience Filter (Multi-select)
            </p>
            <div className="grid gap-1 sm:grid-cols-2">
              {EXPERIENCE_BUCKETS.map((bucket) => (
                <label key={bucket.id} className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedExperienceBuckets.includes(bucket.id)}
                    onChange={() =>
                      setSelectedExperienceBuckets((prev) => toggleSelection(prev, bucket.id))
                    }
                  />
                  {bucket.label}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Current CTC Filter (Multi-select)
            </p>
            <div className="grid gap-1 sm:grid-cols-2">
              {CTC_BUCKETS.map((bucket) => (
                <label key={bucket.id} className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedCtcBuckets.includes(bucket.id)}
                    onChange={() =>
                      setSelectedCtcBuckets((prev) => toggleSelection(prev, bucket.id))
                    }
                  />
                  {bucket.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      <StudentsTable
        rows={filteredFavoriteRows}
        title={`Favourite Students (${filteredFavoriteRows.length})`}
        selectable
        selectedRowIds={selectedFavoriteStudentIds}
        onToggleRow={toggleFavoriteSelection}
        onToggleAll={toggleAllFavorites}
      />
    </div>
  );
}
