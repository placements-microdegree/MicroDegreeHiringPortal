import { useEffect, useMemo, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { listReferredDataForAdmin } from "../../services/referralService";
import { showError } from "../../utils/alerts";

function formatConnectionType(value) {
  if (value === "i_work_here") return "I work here";
  if (value === "friend_works_here") return "Friend works here";
  if (value === "saw_online") return "Saw online";
  return "-";
}

function formatFollowUpType(value) {
  if (value === "direct_referral") return "Can refer directly";
  if (value === "share_contact") return "Shared HR/Hiring contact";
  if (value === "team_decide") return "Placement team to decide";
  return "Pending";
}

export default function ReferredData() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReferredData = async () => {
    setLoading(true);
    try {
      const referrals = await listReferredDataForAdmin();
      setRows(Array.isArray(referrals) ? referrals : []);
    } catch (error) {
      setRows([]);
      await showError(error?.message || "Failed to load referred data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReferredData();
  }, []);

  const mapped = useMemo(() => {
    return rows.map((row) => ({
      id: row.id,
      studentName: row?.profiles?.full_name || "-",
      studentEmail: row?.profiles?.email || "-",
      studentPhone: row?.profiles?.phone || "-",
      companyName: row.company_name || "-",
      roleDetails: row.role_details || "-",
      jobLocation: row.job_location || "-",
      connectionType: formatConnectionType(row.connection_type),
      comments: row.comments || "-",
      followUpType: formatFollowUpType(row.follow_up_type),
      followUpContact: row.follow_up_contact || "-",
      followUpNote: row.follow_up_note || "-",
      createdAt: row.created_at
        ? new Date(row.created_at).toLocaleString()
        : "-",
      status: row.status || "-",
    }));
  }, [rows]);

  let bodyContent = (
    <tr>
      <td className="px-4 py-4 text-slate-600" colSpan={11}>
        No referred data available.
      </td>
    </tr>
  );

  if (loading) {
    bodyContent = (
      <tr>
        <td className="px-4 py-4 text-slate-600" colSpan={11}>
          Loading referred data...
        </td>
      </tr>
    );
  } else if (mapped.length) {
    bodyContent = mapped.map((row) => (
      <tr key={row.id} className="border-t border-slate-200 align-top">
        <td className="px-4 py-3 text-slate-700">
          <div className="font-medium text-slate-900">{row.studentName}</div>
          <div>{row.studentEmail}</div>
          <div>{row.studentPhone}</div>
        </td>
        <td className="px-4 py-3 text-slate-700">{row.companyName}</td>
        <td className="px-4 py-3 text-slate-700">{row.roleDetails}</td>
        <td className="px-4 py-3 text-slate-700">{row.jobLocation}</td>
        <td className="px-4 py-3 text-slate-700">{row.connectionType}</td>
        <td className="px-4 py-3 text-slate-700">{row.comments}</td>
        <td className="px-4 py-3 text-slate-700">{row.followUpType}</td>
        <td className="px-4 py-3 text-slate-700">{row.followUpContact}</td>
        <td className="px-4 py-3 text-slate-700">{row.followUpNote}</td>
        <td className="px-4 py-3 text-slate-700">
          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
            {row.status}
          </span>
        </td>
        <td className="px-4 py-3 text-slate-700">{row.createdAt}</td>
      </tr>
    ));
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold text-slate-900">
              Referred Data
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Student shared company openings and referral follow-up details.
            </p>
          </div>
          <button
            type="button"
            onClick={loadReferredData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FiRefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-300 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Role/Job details</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Connection</th>
                <th className="px-4 py-3">Comments</th>
                <th className="px-4 py-3">Follow-up</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Shared On</th>
              </tr>
            </thead>
            <tbody>{bodyContent}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
