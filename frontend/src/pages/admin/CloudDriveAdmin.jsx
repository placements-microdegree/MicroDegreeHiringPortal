import { useEffect, useMemo, useState } from "react";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import {
  listDrives,
  listRegistrations,
  updateRegistration,
  upsertDrive,
} from "../../services/cloudDriveService";

const HR_STATUS_OPTIONS = [
  "Registered",
  "MCQ Screening Test cleared",
  "Practical Online Task Round",
  "Face-to-Face Round (Live Interview)",
  "Managerial Round",
  "Rejected",
];

function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function toDatetimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toIsoFromDatetimeLocal(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function createEmptyDrive() {
  return {
    id: null,
    title: "Career Assistance",
    drive_date: "",
    registration_close_at: "",
    zoom_link: "",
    passcode: "",
    notes: "",
    is_active: true,
  };
}

function normalizeDriveForForm(drive) {
  if (!drive) return createEmptyDrive();
  return {
    id: drive.id || null,
    title: drive.title || "Career Assistance",
    drive_date: toDateInputValue(drive.drive_date),
    registration_close_at: toDatetimeLocalValue(drive.registration_close_at),
    zoom_link: drive.zoom_link || "",
    passcode: drive.passcode || "",
    notes: drive.notes || "",
    is_active: Boolean(drive.is_active),
  };
}

export default function CloudDriveAdmin() {
  const [drives, setDrives] = useState([]);
  const [showAllSavedDrives, setShowAllSavedDrives] = useState(false);
  const [currentDrive, setCurrentDrive] = useState(createEmptyDrive());
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({
    full_name: "",
    email: "",
    phone: "",
    batch: "",
    status: "",
  });

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const fetchedDrives = await listDrives();
      setDrives(fetchedDrives);

      const active = fetchedDrives.find((d) => d.is_active);
      const latest = fetchedDrives[0];
      const selected = active || latest || null;
      setCurrentDrive(normalizeDriveForForm(selected));

      if (selected?.id) {
        const regs = await listRegistrations({ driveId: selected.id });
        setRegistrations(regs || []);
      } else {
        setRegistrations([]);
      }
    } catch (err) {
      alert(err.message || "Failed to load cloud drive admin data");
    } finally {
      setLoading(false);
    }
  }

  function onDriveFieldChange(event) {
    const { name, value, type, checked } = event.target;
    setCurrentDrive((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function saveDriveSettings() {
    if (!currentDrive.drive_date) {
      alert("Drive Date is required.");
      return;
    }
    if (!currentDrive.registration_close_at) {
      alert("Registration Close Date & Time is required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: currentDrive.id || undefined,
        title: currentDrive.title || "Career Assistance",
        drive_date: currentDrive.drive_date,
        registration_close_at: toIsoFromDatetimeLocal(
          currentDrive.registration_close_at,
        ),
        drive_time: toIsoFromDatetimeLocal(currentDrive.registration_close_at),
        zoom_link: currentDrive.zoom_link || null,
        passcode: currentDrive.passcode || null,
        notes: currentDrive.notes || null,
        is_active: Boolean(currentDrive.is_active),
      };
      const saved = await upsertDrive(payload);
      setCurrentDrive(normalizeDriveForForm(saved));
      await loadData();
      alert("Drive settings saved successfully.");
    } catch (err) {
      alert(err.message || "Failed to save drive settings");
    } finally {
      setSaving(false);
    }
  }

  async function loadSavedDrive(drive) {
    setCurrentDrive(normalizeDriveForForm(drive));
    if (!drive?.id) {
      setRegistrations([]);
      return;
    }
    try {
      const regs = await listRegistrations({ driveId: drive.id });
      setRegistrations(regs || []);
    } catch (err) {
      alert(err.message || "Failed to load registrations for selected drive");
    }
  }

  async function onStatusChange(registrationId, status) {
    try {
      await updateRegistration(registrationId, { status });
      setRegistrations((prev) =>
        prev.map((r) => (r.id === registrationId ? { ...r, status } : r)),
      );
    } catch (err) {
      alert(err.message || "Failed to update student status");
    }
  }

  const filteredRegistrations = useMemo(() => {
    return registrations.filter((r) => {
      if (
        filters.full_name &&
        !String(r.full_name || "")
          .toLowerCase()
          .includes(filters.full_name.toLowerCase())
      ) {
        return false;
      }
      if (
        filters.email &&
        !String(r.email || "").toLowerCase().includes(filters.email.toLowerCase())
      ) {
        return false;
      }
      if (
        filters.phone &&
        !String(r.phone || "").toLowerCase().includes(filters.phone.toLowerCase())
      ) {
        return false;
      }
      if (
        filters.batch &&
        !String(r.batch || "").toLowerCase().includes(filters.batch.toLowerCase())
      ) {
        return false;
      }
      if (filters.status && String(r.status || "") !== filters.status) {
        return false;
      }
      return true;
    });
  }, [registrations, filters]);

  const visibleSavedDrives = useMemo(
    () => (showAllSavedDrives ? drives : drives.slice(0, 3)),
    [drives, showAllSavedDrives],
  );

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold text-slate-900">Cloud Drive - HR Control Panel</h1>
            <p className="mt-1 text-sm text-slate-600">
              Set the actual drive date, registration closing date & time, and student meeting details.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              currentDrive.is_active
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {currentDrive.is_active ? "ACTIVE" : "INACTIVE"}
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input
            label="Drive Title"
            name="title"
            value={currentDrive.title}
            onChange={onDriveFieldChange}
            placeholder="Career Assistance"
          />

          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">
              Drive Date (when drive happens)
            </div>
            <input
              type="date"
              name="drive_date"
              value={currentDrive.drive_date}
              onChange={onDriveFieldChange}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>

          <label className="block md:col-span-2">
            <div className="mb-1 text-sm font-medium text-slate-700">
              Registration Close Date & Time (cut-off for student registration)
            </div>
            <input
              type="datetime-local"
              name="registration_close_at"
              value={currentDrive.registration_close_at}
              onChange={onDriveFieldChange}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>

          <Input
            label="Zoom Link"
            name="zoom_link"
            value={currentDrive.zoom_link}
            onChange={onDriveFieldChange}
            placeholder="https://zoom.us/j/..."
          />

          <Input
            label="Passcode"
            name="passcode"
            value={currentDrive.passcode}
            onChange={onDriveFieldChange}
            placeholder="Passcode"
          />

          <label className="block md:col-span-2">
            <div className="mb-1 text-sm font-medium text-slate-700">Notes (optional)</div>
            <textarea
              name="notes"
              value={currentDrive.notes}
              onChange={onDriveFieldChange}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="Any additional instructions for students"
            />
          </label>

          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 md:col-span-2">
            <input
              type="checkbox"
              name="is_active"
              checked={currentDrive.is_active}
              onChange={onDriveFieldChange}
            />
            Keep this drive ACTIVE for students
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" onClick={() => setCurrentDrive(createEmptyDrive())}>
            New Drive Draft
          </Button>
          <Button onClick={saveDriveSettings} disabled={saving || loading}>
            {saving ? "Saving..." : "Save Drive Settings"}
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Saved Drives</h2>
        <p className="mt-1 text-[11px] text-slate-500">Click any drive to load its existing values for update.</p>

        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {drives.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-600">
              No drives saved yet.
            </div>
          ) : (
            visibleSavedDrives.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => loadSavedDrive(d)}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left hover:bg-slate-100"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900">{d.title || "Career Assistance"}</div>
                  <div className="text-xs text-slate-600">Drive: {toDateInputValue(d.drive_date) || "-"}</div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    d.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {d.is_active ? "Active" : "Inactive"}
                </span>
              </button>
            ))
          )}
        </div>
        {drives.length > 3 ? (
          <div className="mt-3 flex justify-end">
            <Button
              variant="outline"
              className="px-3 py-1.5 text-xs"
              onClick={() => setShowAllSavedDrives((prev) => !prev)}
            >
              {showAllSavedDrives ? "Show Recent 3" : "View More"}
            </Button>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Student Registrations (All Form Data)</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-5">
          <Input
            label="Filter Name"
            value={filters.full_name}
            onChange={(e) => setFilters((prev) => ({ ...prev, full_name: e.target.value }))}
          />
          <Input
            label="Filter Email"
            value={filters.email}
            onChange={(e) => setFilters((prev) => ({ ...prev, email: e.target.value }))}
          />
          <Input
            label="Filter Phone"
            value={filters.phone}
            onChange={(e) => setFilters((prev) => ({ ...prev, phone: e.target.value }))}
          />
          <Input
            label="Filter Batch"
            value={filters.batch}
            onChange={(e) => setFilters((prev) => ({ ...prev, batch: e.target.value }))}
          />
          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-700">Filter Status</div>
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">All</option>
              {HR_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[1900px] table-auto border-collapse">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold text-slate-700">
                <th className="p-2">Name</th>
                <th className="p-2">Email</th>
                <th className="p-2">Phone</th>
                <th className="p-2">Current Location</th>
                <th className="p-2">Relocation Preference</th>
                <th className="p-2">Highest Education</th>
                <th className="p-2">Total Experience</th>
                <th className="p-2">AWS Experience</th>
                <th className="p-2">Previous Domain</th>
                <th className="p-2">AWS Cert</th>
                <th className="p-2">DevOps Cert</th>
                <th className="p-2">Institute Name</th>
                <th className="p-2">Source</th>
                <th className="p-2">MD Certified</th>
                <th className="p-2">Batch</th>
                <th className="p-2">HR Status</th>
                <th className="p-2">Registered At</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={17} className="p-3 text-center text-sm text-slate-500">
                    No registrations found for the current filters.
                  </td>
                </tr>
              ) : (
                filteredRegistrations.map((r) => (
                  <tr key={r.id} className="border-b text-xs text-slate-700">
                    <td className="p-2">{r.full_name || "-"}</td>
                    <td className="p-2">{r.email || "-"}</td>
                    <td className="p-2">{r.phone || "-"}</td>
                    <td className="p-2">{r.current_location || "-"}</td>
                    <td className="p-2">{r.relocation_preference || "-"}</td>
                    <td className="p-2">{r.highest_education || "-"}</td>
                    <td className="p-2">{r.total_experience || "-"}</td>
                    <td className="p-2">{r.aws_experience || "-"}</td>
                    <td className="p-2">{r.domain || "-"}</td>
                    <td className="p-2">{r.aws_cert ? "Yes" : "No"}</td>
                    <td className="p-2">{r.devops_cert ? "Yes" : "No"}</td>
                    <td className="p-2">{r.institute_name || "-"}</td>
                    <td className="p-2">{r.source || "-"}</td>
                    <td className="p-2">{r.microdegree_certified ? "Yes" : "No"}</td>
                    <td className="p-2">{r.batch || "-"}</td>
                    <td className="p-2">
                      <select
                        value={r.status || "Registered"}
                        onChange={(e) => onStatusChange(r.id, e.target.value)}
                        className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                      >
                        {HR_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2">{r.registered_at ? new Date(r.registered_at).toLocaleString() : "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
