// FILE: src/components/admin/StudentsTable.jsx

import PropTypes from "prop-types";
import { FiFileText, FiExternalLink } from "react-icons/fi";
import { AiOutlineHeart, AiFillHeart } from "react-icons/ai";

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function formatLastActiveLabel(value) {
  if (!value) return "No recent activity";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No recent activity";

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTarget = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const dayDiff = Math.floor((startToday - startTarget) / (24 * 60 * 60 * 1000));

  if (dayDiff <= 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  return `${dayDiff} days ago`;
}

export default function StudentsTable({
  rows,
  title = "Students",
  selectable = false,
  selectedRowIds = [],
  onToggleRow,
  onToggleAll,
  favoriteRowIds = [],
  onToggleFavorite,
}) {
  const rowList = Array.isArray(rows) ? rows : [];
  const selectedSet = new Set(selectedRowIds);
  const allSelected =
    rowList.length > 0 && rowList.every((row) => selectedSet.has(row.id));
  const favoriteSet = new Set(Array.isArray(favoriteRowIds) ? favoriteRowIds : []);
  const columnCount =
    12 + (selectable ? 1 : 0) + (onToggleFavorite ? 1 : 0);

  return (
    <div className="rounded-xl bg-white p-5">
      <div className="text-base font-semibold text-slate-900">{title}</div>
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-300 text-left text-sm">
            <thead className="bg-bgLight text-xs uppercase text-slate-600">
              <tr>
                {selectable ? (
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(event) => onToggleAll?.(event.target.checked)}
                      aria-label="Select all students"
                    />
                  </th>
                ) : null}
                {onToggleFavorite ? (
                  <th className="px-4 py-3"> </th>
                ) : null}
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Preferred Location</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Eligibility</th>
                <th className="px-4 py-3">Current CTC (in LPA)</th>
                <th className="px-4 py-3">Expected CTC (in LPA)</th>
                <th className="px-4 py-3">Total Experience</th>
                <th className="px-4 py-3">Profile Last Updated</th>
                <th className="px-4 py-3">Last Active</th>
                <th className="px-4 py-3">Resume</th>
              </tr>
            </thead>
            <tbody>
              {rowList.length ? (
                rowList.map((r) => (
                  <tr
                    key={r.email}
                    className="border-t border-slate-200 hover:bg-slate-50 transition"
                  >
                    {selectable ? (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedSet.has(r.id)}
                          onChange={(event) =>
                            onToggleRow?.(r.id, event.target.checked)
                          }
                          aria-label={`Select ${r.fullName || r.email || "student"}`}
                        />
                      </td>
                    ) : null}
                    {onToggleFavorite ? (
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => onToggleFavorite?.(r.id)}
                          className="inline-flex items-center justify-center rounded-full p-1 text-slate-400 hover:text-rose-600"
                          aria-label={favoriteSet.has(r.id) ? "Unfavorite" : "Favorite"}
                        >
                          {favoriteSet.has(r.id) ? (
                            <AiFillHeart className="h-5 w-5 text-rose-600" />
                          ) : (
                            <AiOutlineHeart className="h-5 w-5" />
                          )}
                        </button>
                      </td>
                    ) : null}
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {r.fullName || "Student"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{r.email}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {r.location || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {r.preferredLocation || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {r.phone || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {r.isEligible ? (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs  text-emerald-700">
                          Eligible
                          {r.eligibleUntil
                            ? ` until ${new Date(r.eligibleUntil).toLocaleDateString()}`
                            : ""}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-red-700 px-2.5 py-0.5 text-xs font-semibold text-white">
                          Not eligible
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {r.currentCtc ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {r.expectedCtc ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {r.totalExperience ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {formatDateTime(r.updatedAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      <div>{formatLastActiveLabel(r.lastActiveAt)}</div>
                      <div className="text-[11px] text-slate-500">
                        {formatDateTime(r.lastActiveAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {r.resumeUrl ? (
                        <a
                          href={r.resumeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
                        >
                          <FiExternalLink className="h-3.5 w-3.5" />
                          View
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-400">
                          <FiFileText className="h-3.5 w-3.5" />
                          No resume
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="px-4 py-4 text-slate-600"
                    colSpan={columnCount}
                  >
                    No students loaded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

StudentsTable.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.object),
  title: PropTypes.string,
  selectable: PropTypes.bool,
  selectedRowIds: PropTypes.arrayOf(PropTypes.string),
  onToggleRow: PropTypes.func,
  onToggleAll: PropTypes.func,
  favoriteRowIds: PropTypes.arrayOf(PropTypes.string),
  onToggleFavorite: PropTypes.func,
};
