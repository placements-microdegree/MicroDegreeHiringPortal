import { useEffect, useMemo, useState } from "react";
import { FiDownload, FiHeart, FiChevronDown, FiSearch } from "react-icons/fi";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import StudentsTable from "../../components/admin/StudentsTable";
import StudentProfileModal from "../../components/admin/StudentProfileModal";
import Modal from "../../components/common/Modal";
import { listAllApplications } from "../../services/applicationService";
import {
  addStudentsToFavoritePlaylist,
  createFavoritePlaylist,
  listFavoritePlaylists,
  listFavoriteStudents,
  listStudents,
  removeFavoriteStudents,
  updateStudentCloudDriveProfile,
} from "../../services/adminService";
import { showError } from "../../utils/alerts";
import { useAuth } from "../../context/authStore";
import { ROLES } from "../../utils/constants";

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

function isClearedStatus(value) {
  return ["Cleared", "Cleared AWS Drive", "Cleared DevOps Drive"].includes(
    String(value || "").trim(),
  );
}

function SearchableMultiSelect({
  label,
  options,
  selectedValues,
  onToggleValue,
  onClear,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) =>
      String(option.label || "")
        .toLowerCase()
        .includes(query),
    );
  }, [options, search]);

  const selectedCount = selectedValues.length;

  return (
    <div className="relative">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
        {label}
      </span>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-indigo-300 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
      >
        <span>
          {selectedCount > 0
            ? `${selectedCount} selected`
            : `Select ${label.toLowerCase()}`}
        </span>
        <FiChevronDown
          className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white p-2 shadow-lg">
          <div className="relative mb-2">
            <FiSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search options"
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-1.5 pl-8 pr-2 text-xs text-slate-700 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
            />
          </div>

          <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
            {filteredOptions.length ? (
              filteredOptions.map((option) => (
                <label
                  key={option.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-[#F8FAFC]"
                >
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option.id)}
                    onChange={() => onToggleValue(option.id)}
                    className="h-4 w-4 accent-indigo-600"
                  />
                  {option.label}
                </label>
              ))
            ) : (
              <div className="px-2 py-2 text-xs text-slate-500">
                No matching options.
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-[#E2E8F0] pt-2">
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-700 hover:underline"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-[#F8FAFC]"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function Favourites() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [allApplications, setAllApplications] = useState([]);
  const [favoriteStudentIds, setFavoriteStudentIds] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState("");
  const [selectedFavoriteStudentIds, setSelectedFavoriteStudentIds] = useState(
    [],
  );
  const [selectedCtcBuckets, setSelectedCtcBuckets] = useState([]);
  const [selectedExperienceBuckets, setSelectedExperienceBuckets] = useState(
    [],
  );
  const [locationFilter, setLocationFilter] = useState("");
  const [preferredLocationFilter, setPreferredLocationFilter] = useState("");
  const [resumeFilter, setResumeFilter] = useState("");
  const [applicationMonthFilter, setApplicationMonthFilter] = useState("all");
  const [dateSort, setDateSort] = useState("latest-profile");
  const [searchTerm, setSearchTerm] = useState("");
  const [eligibilityFilter, setEligibilityFilter] = useState("all");
  const [cloudDriveFilter, setCloudDriveFilter] = useState("all");
  const [activeOnly, setActiveOnly] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [playlistNameDraft, setPlaylistNameDraft] = useState("");
  const [playlistCreating, setPlaylistCreating] = useState(false);

  useEffect(() => {
    Promise.all([
      listStudents(),
      listFavoriteStudents(),
      listFavoritePlaylists(),
      listAllApplications(),
    ])
      .then(([students, favoriteIds, favoritePlaylists, applications]) => {
        setRows(Array.isArray(students) ? students : []);
        setFavoriteStudentIds(Array.isArray(favoriteIds) ? favoriteIds : []);
        setAllApplications(Array.isArray(applications) ? applications : []);
        const nextPlaylists = Array.isArray(favoritePlaylists)
          ? favoritePlaylists
          : [];
        setPlaylists(nextPlaylists);
        setSelectedPlaylistId((prev) =>
          prev && nextPlaylists.some((playlist) => String(playlist.id) === prev)
            ? prev
            : String(nextPlaylists[0]?.id || ""),
        );
      })
      .catch(async (error) => {
        setRows([]);
        setFavoriteStudentIds([]);
        setAllApplications([]);
        setPlaylists([]);
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
        cloudDriveStatus: r.cloud_drive_status ?? r.cloudDriveStatus ?? null,
        driveClearedDate: r.drive_cleared_date ?? r.driveClearedDate ?? null,
        driveClearedStatus:
          r.drive_cleared_status ?? r.driveClearedStatus ?? [],
        cloudDriveHistory:
          r.cloud_drive_status_history ?? r.cloudDriveStatusHistory ?? [],
        skills: r.skills ?? [],
        experienceLevel: r.experience_level || r.experienceLevel || null,
        updatedAt: r.updated_at || r.updatedAt || null,
        recentApplicationAt:
          r.recent_application_created_at || r.recentApplicationCreatedAt || null,
        lastActiveAt: r.last_active_at || r.lastActiveAt || null,
      })),
    [rows],
  );

  const appliedJobsByStudentId = useMemo(() => {
    const byStudent = new Map();
    allApplications.forEach((row) => {
      const studentId = String(
        row?.student?.id || row?.student_id || row?.studentId || "",
      ).trim();
      if (!studentId) return;

      const existing = byStudent.get(studentId) || [];
      existing.push({
        applicationId: row?.id || null,
        jobId: row?.job?.id || row?.job_id || row?.jobId || null,
        company: row?.job?.company || row?.jobs?.company || "-",
        title: row?.job?.title || row?.jobs?.title || row?.jobTitle || "-",
        status: row?.sub_stage || row?.status || "Applied",
        appliedAt: row?.created_at || row?.createdAt || null,
      });
      byStudent.set(studentId, existing);
    });

    byStudent.forEach((items, studentId) => {
      byStudent.set(
        studentId,
        items.sort(
          (a, b) =>
            new Date(b.appliedAt || 0).getTime() -
            new Date(a.appliedAt || 0).getTime(),
        ),
      );
    });

    return byStudent;
  }, [allApplications]);

  const favoriteRows = useMemo(() => {
    const favoriteSet = new Set(favoriteStudentIds);
    return mapped.filter((row) => favoriteSet.has(row.id));
  }, [mapped, favoriteStudentIds]);

  const monthOptions = useMemo(() => {
    const values = new Set();
    favoriteRows.forEach((row) => {
      if (!row.recentApplicationAt) return;
      const date = new Date(row.recentApplicationAt);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      values.add(key);
    });
    return [...values].sort((a, b) => (a > b ? -1 : 1));
  }, [favoriteRows]);

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
      if (
        !belongsToAnyBucket(
          rowExperience,
          selectedExperienceBuckets,
          EXPERIENCE_BUCKETS,
        )
      ) {
        return false;
      }
      if (locationFilter && String(row.location || "") !== locationFilter)
        return false;
      if (
        preferredLocationFilter &&
        String(row.preferredLocation || "") !== preferredLocationFilter
      ) {
        return false;
      }
      if (resumeFilter === "has" && !hasResume) return false;
      if (resumeFilter === "no" && hasResume) return false;

      if (applicationMonthFilter !== "all") {
        const applied = new Date(row.recentApplicationAt || "");
        if (Number.isNaN(applied.getTime())) return false;
        const key = `${applied.getFullYear()}-${String(applied.getMonth() + 1).padStart(2, "0")}`;
        if (key !== applicationMonthFilter) return false;
      }

      if (eligibilityFilter === "eligible" && !row.isEligible) return false;
      if (eligibilityFilter === "not-eligible" && row.isEligible) return false;

      if (
        cloudDriveFilter === "cleared" &&
        !isClearedStatus(row.cloudDriveStatus)
      ) {
        return false;
      }
      if (
        cloudDriveFilter === "not-cleared" &&
        isClearedStatus(row.cloudDriveStatus)
      ) {
        return false;
      }

      if (searchTerm.trim()) {
        const search = searchTerm.trim().toLowerCase();
        const name = String(row.fullName || "").toLowerCase();
        const email = String(row.email || "").toLowerCase();
        if (!name.includes(search) && !email.includes(search)) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      const toTime = (value) => {
        const parsed = Date.parse(value || "");
        return Number.isFinite(parsed) ? parsed : 0;
      };
      const aProfileTime = toTime(a.updatedAt);
      const bProfileTime = toTime(b.updatedAt);
      const aAppliedTime = toTime(a.recentApplicationAt);
      const bAppliedTime = toTime(b.recentApplicationAt);

      if (dateSort === "latest-application") return bAppliedTime - aAppliedTime;
      if (dateSort === "oldest-application") return aAppliedTime - bAppliedTime;
      if (dateSort === "oldest-profile") return aProfileTime - bProfileTime;
      return bProfileTime - aProfileTime;
    });
  }, [
    favoriteRows,
    activeOnly,
    selectedCtcBuckets,
    selectedExperienceBuckets,
    locationFilter,
    preferredLocationFilter,
    resumeFilter,
    applicationMonthFilter,
    dateSort,
    searchTerm,
    eligibilityFilter,
    cloudDriveFilter,
  ]);

  const activeFavoriteCount = useMemo(
    () =>
      favoriteRows.filter((row) => isRecentlyActive(row.lastActiveAt)).length,
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

  const openCreatePlaylistModal = async () => {
    if (selectedFavoriteStudentIds.length === 0) {
      await showError(
        "Select at least one favourite student to create playlist",
      );
      return;
    }

    setPlaylistNameDraft("");
    setPlaylistModalOpen(true);
  };

  const createPlaylistFromSelection = async () => {
    const trimmedName = String(playlistNameDraft || "").trim();

    if (!trimmedName) {
      await showError("Playlist name is required");
      return;
    }

    try {
      setPlaylistCreating(true);
      const created = await createFavoritePlaylist({
        name: trimmedName,
        studentIds: selectedFavoriteStudentIds,
      });

      if (!created) return;

      setPlaylists((prev) => [created, ...prev]);
      setSelectedPlaylistId(String(created.id));
      setPlaylistModalOpen(false);
      setPlaylistNameDraft("");

      const rolePrefix =
        user?.role === ROLES.SUPER_ADMIN ? "/superadmin" : "/admin";
      navigate(`${rolePrefix}/playlist/${created.id}`);
    } catch (error) {
      await showError(error?.message || "Failed to create playlist");
    } finally {
      setPlaylistCreating(false);
    }
  };

  const addSelectionToExistingPlaylist = async () => {
    if (selectedFavoriteStudentIds.length === 0) {
      await showError("Select at least one favourite student to add");
      return;
    }

    if (!selectedPlaylistId) {
      await showError("Select a playlist first");
      return;
    }

    try {
      const updated = await addStudentsToFavoritePlaylist(
        selectedPlaylistId,
        selectedFavoriteStudentIds,
      );
      if (!updated) return;

      setPlaylists((prev) =>
        prev.map((playlist) =>
          String(playlist.id) === String(updated.id) ? updated : playlist,
        ),
      );

      toast.success(
        `${selectedFavoriteStudentIds.length} student${selectedFavoriteStudentIds.length === 1 ? "" : "s"} added to ${updated.name || "playlist"}`,
      );
    } catch (error) {
      await showError(error?.message || "Failed to add students to playlist");
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
      "Cloud Drive Status",
      "Drive Cleared Date",
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
          row.cloudDriveStatus || "",
          row.driveClearedDate || "",
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

  const openStudentProfile = (student) => {
    setSelectedStudent(student);
    setProfileModalOpen(true);
  };

  const closeStudentProfile = () => {
    setProfileModalOpen(false);
    setSelectedStudent(null);
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setEligibilityFilter("all");
    setCloudDriveFilter("all");
    setActiveOnly(false);
    setLocationFilter("");
    setPreferredLocationFilter("");
    setResumeFilter("");
    setApplicationMonthFilter("all");
    setDateSort("latest-profile");
    setSelectedCtcBuckets([]);
    setSelectedExperienceBuckets([]);
  };

  const saveStudentCloudDriveProfile = async ({ cloudDriveHistory }) => {
    if (!selectedStudent?.id) return;

    try {
      setProfileSaving(true);
      const updated = await updateStudentCloudDriveProfile(selectedStudent.id, {
        cloudDriveHistory,
      });

      setRows((prev) =>
        prev.map((row) =>
          row.id === selectedStudent.id
            ? {
                ...row,
                cloud_drive_status: updated?.cloud_drive_status ?? null,
                drive_cleared_date: updated?.drive_cleared_date ?? null,
                drive_cleared_status: updated?.drive_cleared_status || [],
                cloud_drive_status_history:
                  updated?.cloud_drive_status_history || [],
              }
            : row,
        ),
      );

      setSelectedStudent((prev) =>
        prev
          ? {
              ...prev,
              cloudDriveStatus: updated?.cloud_drive_status ?? null,
              driveClearedDate: updated?.drive_cleared_date ?? null,
              driveClearedStatus: updated?.drive_cleared_status || [],
              cloudDriveHistory: updated?.cloud_drive_status_history || [],
            }
          : prev,
      );

      setProfileModalOpen(false);
    } catch (error) {
      await showError(
        error?.message || "Failed to update cloud drive profile fields",
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const filterControlClass =
    "w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20";

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 font-[Inter,ui-sans-serif,system-ui]">
        <div className="mb-4 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
          <div className="grid grid-cols-1 divide-y divide-[#E2E8F0] text-sm md:grid-cols-4 md:divide-x md:divide-y-0">
            <div className="px-4 py-3 text-slate-700">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                All Favourites
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {favoriteRows.length}
              </div>
            </div>
            <div className="px-4 py-3 text-slate-700">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Active ({ACTIVE_WINDOW_DAYS} days)
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {activeFavoriteCount}
              </div>
            </div>
            <div className="px-4 py-3 text-slate-700">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Before Filters
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {baseCountBeforeFilters}
              </div>
            </div>
            <div className="px-4 py-3 text-slate-700">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                After Filters
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {filteredFavoriteRows.length}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-5">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Search Name/Email
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Type name or email"
              className={filterControlClass}
            />
          </label>

          <label className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(event) => setActiveOnly(event.target.checked)}
              className="h-4 w-4 accent-indigo-600"
            />
            Active Students Only
          </label>

          <SearchableMultiSelect
            label="Experience"
            options={EXPERIENCE_BUCKETS}
            selectedValues={selectedExperienceBuckets}
            onToggleValue={(bucketId) =>
              setSelectedExperienceBuckets((prev) =>
                toggleSelection(prev, bucketId),
              )
            }
            onClear={() => setSelectedExperienceBuckets([])}
          />

          <SearchableMultiSelect
            label="Current CTC"
            options={CTC_BUCKETS}
            selectedValues={selectedCtcBuckets}
            onToggleValue={(bucketId) =>
              setSelectedCtcBuckets((prev) => toggleSelection(prev, bucketId))
            }
            onClear={() => setSelectedCtcBuckets([])}
          />

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Location
            </span>
            <select
              value={locationFilter}
              onChange={(event) => setLocationFilter(event.target.value)}
              className={filterControlClass}
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
              Eligibility
            </span>
            <select
              value={eligibilityFilter}
              onChange={(event) => setEligibilityFilter(event.target.value)}
              className={filterControlClass}
            >
              <option value="all">All students</option>
              <option value="eligible">Eligible students</option>
              <option value="not-eligible">Not eligible students</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Cloud Drive Cleared
            </span>
            <select
              value={cloudDriveFilter}
              onChange={(event) => setCloudDriveFilter(event.target.value)}
              className={filterControlClass}
            >
              <option value="all">All students</option>
              <option value="cleared">Cleared only</option>
              <option value="not-cleared">Not cleared</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Preferred Location
            </span>
            <select
              value={preferredLocationFilter}
              onChange={(event) =>
                setPreferredLocationFilter(event.target.value)
              }
              className={filterControlClass}
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
              Application Month
            </span>
            <select
              value={applicationMonthFilter}
              onChange={(event) => setApplicationMonthFilter(event.target.value)}
              className={filterControlClass}
            >
              <option value="all">All</option>
              {monthOptions.map((value) => (
                <option key={`fav-app-month-${value}`} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Sort By
            </span>
            <select
              value={dateSort}
              onChange={(event) => setDateSort(event.target.value)}
              className={filterControlClass}
            >
              <option value="latest-profile">Latest profile update</option>
              <option value="oldest-profile">Oldest profile update</option>
              <option value="latest-application">Latest application date</option>
              <option value="oldest-application">Oldest application date</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Resume
            </span>
            <select
              value={resumeFilter}
              onChange={(event) => setResumeFilter(event.target.value)}
              className={filterControlClass}
            >
              <option value="">All</option>
              <option value="has">Has resume</option>
              <option value="no">No resume</option>
            </select>
          </label>

          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end md:col-span-4 xl:col-span-5">
            <select
              value={selectedPlaylistId}
              onChange={(event) => setSelectedPlaylistId(event.target.value)}
              className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 sm:min-w-[220px]"
            >
              <option value="">Select existing playlist</option>
              {playlists.map((playlist) => (
                <option key={playlist.id} value={String(playlist.id)}>
                  {playlist.name} ({playlist.studentCount || 0})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addSelectionToExistingPlaylist}
              disabled={
                selectedFavoriteStudentIds.length === 0 || !selectedPlaylistId
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[210px]"
            >
              Add To Existing Playlist
            </button>
            <button
              type="button"
              onClick={openCreatePlaylistModal}
              disabled={selectedFavoriteStudentIds.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[170px]"
            >
              Create Playlist
            </button>
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-transparent px-3 py-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700 hover:underline"
            >
              Clear Filters
            </button>
            <button
              type="button"
              onClick={removeSelectedFromFavorites}
              disabled={selectedFavoriteStudentIds.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[200px]"
            >
              <FiHeart className="h-4 w-4" />
              Remove Selected
            </button>
            <button
              type="button"
              onClick={exportFilteredCsv}
              disabled={filteredFavoriteRows.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[160px]"
            >
              <FiDownload className="h-4 w-4" />
              Export CSV
            </button>
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
        onNameClick={openStudentProfile}
      />

      <Modal
        open={playlistModalOpen}
        onClose={() => {
          if (playlistCreating) return;
          setPlaylistModalOpen(false);
        }}
        title="Create Playlist"
        maxWidthClass="max-w-[480px]"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                if (playlistCreating) return;
                setPlaylistModalOpen(false);
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              disabled={playlistCreating}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={createPlaylistFromSelection}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={playlistCreating}
            >
              {playlistCreating ? "Creating..." : "Create"}
            </button>
          </div>
        }
      >
        <div className="space-y-2">
          <label
            htmlFor="create-playlist-name"
            className="block text-sm font-semibold text-slate-700"
          >
            Playlist Name
          </label>
          <input
            id="create-playlist-name"
            type="text"
            value={playlistNameDraft}
            onChange={(event) => setPlaylistNameDraft(event.target.value)}
            placeholder="Enter playlist name"
            className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
            autoFocus
          />
          <p className="text-xs text-slate-500">
            Selected students: {selectedFavoriteStudentIds.length}
          </p>
        </div>
      </Modal>

      <StudentProfileModal
        open={profileModalOpen}
        onClose={closeStudentProfile}
        student={selectedStudent}
        appliedJobs={
          selectedStudent
            ? appliedJobsByStudentId.get(String(selectedStudent.id || "")) || []
            : []
        }
        saving={profileSaving}
        onSave={saveStudentCloudDriveProfile}
      />
    </div>
  );
}
