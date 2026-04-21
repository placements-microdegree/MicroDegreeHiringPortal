import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiClock,
  FiSearch,
  FiTrash2,
  FiUsers,
} from "react-icons/fi";
import { toast } from "react-toastify";
import StudentsTable from "../../components/admin/StudentsTable";
import StudentProfileModal from "../../components/admin/StudentProfileModal";
import {
  deleteFavoritePlaylist,
  listFavoritePlaylists,
  listStudents,
  removeStudentsFromFavoritePlaylist,
  updateStudentCloudDriveProfile,
} from "../../services/adminService";
import { showError } from "../../utils/alerts";

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function getVisiblePlaylists(playlists, searchTerm, sortBy) {
  const query = searchTerm.trim().toLowerCase();
  const filtered = playlists.filter((playlist) => {
    if (!query) return true;
    const name = String(playlist?.name || "").toLowerCase();
    return name.includes(query);
  });

  const sorted = [...filtered];
  if (sortBy === "name") {
    sorted.sort((a, b) =>
      String(a?.name || "").localeCompare(String(b?.name || ""), undefined, {
        sensitivity: "base",
      }),
    );
    return sorted;
  }
  if (sortBy === "students") {
    sorted.sort(
      (a, b) => Number(b?.studentCount || 0) - Number(a?.studentCount || 0),
    );
    return sorted;
  }
  sorted.sort(
    (a, b) =>
      new Date(b?.createdAt || 0).getTime() -
      new Date(a?.createdAt || 0).getTime(),
  );
  return sorted;
}

function getPlaylistListPath(pathname) {
  if (pathname.startsWith("/superadmin/")) {
    return "/superadmin/playlist";
  }
  return "/admin/playlist";
}

function getHeadingText(isDetailPage, selectedPlaylist) {
  if (isDetailPage) return selectedPlaylist?.name || "Playlist";
  return "Playlists";
}

function getSubheadingText(isDetailPage) {
  if (isDetailPage) {
    return "All favourite students added to this playlist are shown below.";
  }
  return "Open a playlist card to view the favourite students inside it.";
}

function getCountLabel(
  isDetailPage,
  selectedPlaylistStudentsCount,
  playlistsCount,
) {
  if (isDetailPage) {
    return `${selectedPlaylistStudentsCount} students`;
  }
  const suffix = playlistsCount === 1 ? "" : "s";
  return `${playlistsCount} playlist${suffix}`;
}

function renderInfoBlock({
  isDetailPage,
  playlistsCount,
  totalStudentsAcrossPlaylists,
  selectedPlaylist,
  selectedPlaylistStudents,
}) {
  if (!isDetailPage) {
    return (
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200/80 bg-white/90 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Total Playlists
          </div>
          <div className="mt-1 text-xl font-semibold text-slate-900">
            {playlistsCount}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white/90 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Students Added
          </div>
          <div className="mt-1 text-xl font-semibold text-slate-900">
            {totalStudentsAcrossPlaylists}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white/90 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Avg / Playlist
          </div>
          <div className="mt-1 text-xl font-semibold text-slate-900">
            {playlistsCount
              ? (totalStudentsAcrossPlaylists / playlistsCount).toFixed(1)
              : "0.0"}
          </div>
        </div>
      </div>
    );
  }

  if (selectedPlaylist) {
    return (
      <div className="mb-4 rounded-xl border border-slate-200/80 bg-white/90 p-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700">
            <FiUsers className="h-3.5 w-3.5" />
            {selectedPlaylistStudents.length} students
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
            <FiClock className="h-3.5 w-3.5" />
            Created {formatDateTime(selectedPlaylist.createdAt)}
          </span>
        </div>
      </div>
    );
  }

  return null;
}

export default function Playlists() {
  const location = useLocation();
  const navigate = useNavigate();
  const { playlistId } = useParams();
  const [rows, setRows] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [deletingPlaylistId, setDeletingPlaylistId] = useState(null);
  const [selectedMoveOutStudentIds, setSelectedMoveOutStudentIds] = useState(
    [],
  );
  const [movingOut, setMovingOut] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    Promise.all([listStudents(), listFavoritePlaylists()])
      .then(([students, favoritePlaylists]) => {
        setRows(Array.isArray(students) ? students : []);
        const nextPlaylists = Array.isArray(favoritePlaylists)
          ? favoritePlaylists
          : [];
        setPlaylists(nextPlaylists);
      })
      .catch(async (error) => {
        setRows([]);
        setPlaylists([]);
        await showError(error?.message || "Failed to load playlists");
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
        jobSearchStatus:
          r.job_search_status ?? r.jobSearchStatus ?? "PASSIVE",
        internalFlags: r.internal_flags ?? r.internalFlags ?? [],
        activeResumeId: r.active_resume_id ?? r.activeResumeId ?? "",
        resumesMeta: r.resumes_meta ?? r.resumesMeta ?? [],
        internalNotes: r.internal_notes ?? r.internalNotes ?? [],
        updatedAt: r.updated_at || r.updatedAt || null,
        lastActiveAt: r.last_active_at || r.lastActiveAt || null,
      })),
    [rows],
  );

  const selectedPlaylist = useMemo(() => {
    if (!playlistId) return null;
    return (
      playlists.find(
        (playlist) => String(playlist.id) === String(playlistId),
      ) || null
    );
  }, [playlists, playlistId]);

  const selectedPlaylistStudents = useMemo(() => {
    if (!selectedPlaylist?.studentIds?.length) return [];
    const selectedSet = new Set(selectedPlaylist.studentIds);
    return mapped.filter((row) => selectedSet.has(row.id));
  }, [mapped, selectedPlaylist]);

  const isDetailPage = Boolean(playlistId);
  const hasAnyPlaylists = playlists.length > 0;

  const totalStudentsAcrossPlaylists = useMemo(
    () =>
      playlists.reduce(
        (sum, playlist) => sum + Number(playlist?.studentCount || 0),
        0,
      ),
    [playlists],
  );

  const visiblePlaylists = useMemo(() => {
    return getVisiblePlaylists(playlists, searchTerm, sortBy);
  }, [playlists, searchTerm, sortBy]);

  const hasVisiblePlaylists = visiblePlaylists.length > 0;
  const playlistListPath = getPlaylistListPath(location.pathname);
  const headingText = getHeadingText(isDetailPage, selectedPlaylist);
  const subheadingText = getSubheadingText(isDetailPage);
  const countLabel = getCountLabel(
    isDetailPage,
    selectedPlaylistStudents.length,
    playlists.length,
  );
  const infoBlock = renderInfoBlock({
    isDetailPage,
    playlistsCount: playlists.length,
    totalStudentsAcrossPlaylists,
    selectedPlaylist,
    selectedPlaylistStudents,
  });

  const openStudentProfile = (student) => {
    setSelectedStudent(student);
    setProfileModalOpen(true);
  };

  const closeStudentProfile = () => {
    setProfileModalOpen(false);
    setSelectedStudent(null);
  };

  useEffect(() => {
    setSelectedMoveOutStudentIds([]);
  }, [playlistId]);

  useEffect(() => {
    if (!selectedPlaylist) {
      setSelectedMoveOutStudentIds([]);
      return;
    }
    const availableIds = new Set(selectedPlaylist.studentIds || []);
    setSelectedMoveOutStudentIds((prev) =>
      prev.filter((id) => availableIds.has(id)),
    );
  }, [selectedPlaylist]);

  const removePlaylistFromState = (targetPlaylistId) => {
    setPlaylists((prev) =>
      prev.filter((item) => String(item.id) !== String(targetPlaylistId)),
    );
  };

  const updatePlaylistInState = (updatedPlaylist) => {
    if (!updatedPlaylist?.id) return;
    setPlaylists((prev) =>
      prev.map((item) =>
        String(item.id) === String(updatedPlaylist.id) ? updatedPlaylist : item,
      ),
    );
  };

  const toggleMoveOutSelection = (studentId, checked) => {
    setSelectedMoveOutStudentIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(studentId);
      } else {
        next.delete(studentId);
      }
      return [...next];
    });
  };

  const toggleMoveOutSelectionAll = (checked) => {
    if (!checked) {
      setSelectedMoveOutStudentIds([]);
      return;
    }
    setSelectedMoveOutStudentIds(
      selectedPlaylistStudents.map((student) => student.id).filter(Boolean),
    );
  };

  const moveOutSelectedStudents = async () => {
    if (!selectedPlaylist?.id) return;
    if (!selectedMoveOutStudentIds.length) {
      await showError("Select at least one student to move out");
      return;
    }

    try {
      setMovingOut(true);
      const updatedPlaylist = await removeStudentsFromFavoritePlaylist(
        selectedPlaylist.id,
        selectedMoveOutStudentIds,
      );
      updatePlaylistInState(updatedPlaylist);
      setSelectedMoveOutStudentIds([]);
      toast.success("Selected students moved out of playlist");
    } catch (error) {
      await showError(error?.message || "Failed to move students out");
    } finally {
      setMovingOut(false);
    }
  };

  const requestDeletePlaylist = (playlist) => {
    const toastId = toast.warn(
      <div className="space-y-2">
        <div className="text-sm font-semibold">Delete playlist?</div>
        <div className="text-xs text-slate-700">
          {`"${playlist?.name || "Untitled Playlist"}" will be permanently deleted.`}
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={async () => {
              toast.dismiss(toastId);
              try {
                setDeletingPlaylistId(playlist.id);
                const deleted = await deleteFavoritePlaylist(playlist.id);
                removePlaylistFromState(deleted?.id || playlist.id);
                toast.success("Playlist deleted successfully");
                if (isDetailPage) {
                  navigate(playlistListPath);
                }
              } catch (error) {
                await showError(error?.message || "Failed to delete playlist");
              } finally {
                setDeletingPlaylistId(null);
              }
            }}
            className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => toast.dismiss(toastId)}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>,
      {
        autoClose: false,
        closeOnClick: false,
        draggable: false,
      },
    );
  };

  const saveStudentCloudDriveProfile = async ({
    cloudDriveHistory,
    jobSearchStatus,
    internalFlags,
    internalNote,
    internalNoteId,
    activeResumeId,
    activeResumeApprovalStatus,
    activeResumeRejectionReason,
    resumeUpdates,
  }) => {
    if (!selectedStudent?.id) return;

    try {
      setProfileSaving(true);
      const updated = await updateStudentCloudDriveProfile(selectedStudent.id, {
        cloudDriveHistory,
        jobSearchStatus,
        internalFlags,
        internalNote,
        internalNoteId,
        activeResumeId,
        activeResumeApprovalStatus,
        activeResumeRejectionReason,
        resumeUpdates,
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
                job_search_status: updated?.job_search_status || "PASSIVE",
                internal_flags: updated?.internal_flags || [],
                active_resume_id: updated?.active_resume_id || null,
                resumes_meta: updated?.resumes_meta || [],
                internal_notes: updated?.internal_notes || [],
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
              jobSearchStatus: updated?.job_search_status || "PASSIVE",
              internalFlags: updated?.internal_flags || [],
              activeResumeId: updated?.active_resume_id || "",
              resumesMeta: updated?.resumes_meta || [],
              internalNotes: updated?.internal_notes || [],
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

  return (
    <div className="space-y-4">
      {isDetailPage ? (
        <button
          type="button"
          onClick={() => navigate(playlistListPath)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <FiArrowLeft className="h-4 w-4" />
          Back To Playlists
        </button>
      ) : null}

      <section className="relative overflow-hidden rounded-2xl border border-[#E2E8F0] bg-linear-to-br from-[#F8FAFC] via-white to-[#EEF2FF] p-4 font-[Inter,ui-sans-serif,system-ui] shadow-sm md:p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-200/30 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-10 h-44 w-44 rounded-full bg-cyan-200/25 blur-2xl" />

        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {headingText}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{subheadingText}</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
            {countLabel}
          </span>
        </div>

        {isDetailPage && selectedPlaylist ? (
          <div className="mb-3 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={moveOutSelectedStudents}
              disabled={!selectedMoveOutStudentIds.length || movingOut}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Move Out
            </button>
            <button
              type="button"
              onClick={() => requestDeletePlaylist(selectedPlaylist)}
              disabled={
                String(deletingPlaylistId) === String(selectedPlaylist.id)
              }
              className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiTrash2 className="h-3.5 w-3.5" />
              Delete Playlist
            </button>
          </div>
        ) : null}

        {infoBlock}

        {isDetailPage ? null : (
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="relative md:col-span-2">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search playlist by name"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
              />
            </label>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="students">Sort: Most Students</option>
              <option value="name">Sort: Name A-Z</option>
            </select>
          </div>
        )}

        {!isDetailPage && hasVisiblePlaylists ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visiblePlaylists.map((playlist) => {
              return (
                <button
                  key={playlist.id}
                  type="button"
                  onClick={() => navigate(String(playlist.id))}
                  className="group rounded-xl border border-slate-200 bg-white/95 p-4 text-left transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-base font-semibold text-slate-900">
                      {playlist.name || "Untitled Playlist"}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          requestDeletePlaylist(playlist);
                        }}
                        disabled={
                          String(deletingPlaylistId) === String(playlist.id)
                        }
                        className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-50 p-1 text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label={`Delete ${playlist.name || "playlist"}`}
                      >
                        <FiTrash2 className="h-3.5 w-3.5" />
                      </button>
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                        #{playlist.id}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                    <FiUsers className="h-3.5 w-3.5" />
                    <span>{playlist.studentCount || 0} students</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <FiClock className="h-3.5 w-3.5" />
                    <span>Created {formatDateTime(playlist.createdAt)}</span>
                  </div>
                  <div className="mt-3 text-xs font-semibold text-indigo-700 opacity-80 transition group-hover:opacity-100">
                    Open playlist
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}

        {!isDetailPage && !hasVisiblePlaylists && hasAnyPlaylists ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
            No playlist matches your search. Try a different keyword.
          </div>
        ) : null}

        {!isDetailPage && !hasAnyPlaylists ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
            No playlists created yet. Go to Favourites, select students, and use
            Create Playlist.
          </div>
        ) : null}

        {isDetailPage && !selectedPlaylist ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
            Playlist not found.
          </div>
        ) : null}
      </section>

      {isDetailPage && selectedPlaylist ? (
        <StudentsTable
          rows={selectedPlaylistStudents}
          title={`${selectedPlaylist.name} (${selectedPlaylistStudents.length})`}
          selectable
          selectedRowIds={selectedMoveOutStudentIds}
          onToggleRow={toggleMoveOutSelection}
          onToggleAll={toggleMoveOutSelectionAll}
          onNameClick={openStudentProfile}
        />
      ) : null}

      <StudentProfileModal
        open={profileModalOpen}
        onClose={closeStudentProfile}
        student={selectedStudent}
        saving={profileSaving}
        onSave={saveStudentCloudDriveProfile}
      />
    </div>
  );
}
