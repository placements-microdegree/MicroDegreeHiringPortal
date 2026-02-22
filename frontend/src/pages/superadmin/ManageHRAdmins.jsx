import { useEffect, useState } from "react";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { listAdmins, promoteAdmin } from "../../services/adminService";
import { showError, showSuccess } from "../../utils/alerts";

export default function ManageHRAdmins() {
  const [email, setEmail] = useState("");
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    const rows = await listAdmins();
    setAdmins(rows);
  };

  useEffect(() => {
    refresh();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await promoteAdmin(email);
      await showSuccess(`Promoted ${email} to ADMIN.`);
      setEmail("");
      await refresh();
    } catch (err) {
      await showError(err?.message || "Failed to promote", "Promotion Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={submit}
        className="rounded-xl border border-slate-200 bg-white p-4"
      >
        <div className="text-base font-semibold text-slate-900">
          Add HR Admin by Email
        </div>
        <div className="mt-3 flex gap-3">
          <div className="flex-1">
            <Input
              label="Gmail / Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hr@example.com"
              required
            />
          </div>
          <div className="self-end">
            <Button type="submit" disabled={loading || !email}>
              {loading ? "Saving..." : "Promote to ADMIN"}
            </Button>
          </div>
        </div>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-base font-semibold text-slate-900">
          Current HR Admins
        </div>
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-bgLight text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
              </tr>
            </thead>
            <tbody>
              {admins.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-slate-600" colSpan={3}>
                    No HR admins yet.
                  </td>
                </tr>
              ) : (
                admins.map((a) => (
                  <tr key={a.id} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {a.full_name || "HR"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{a.email}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {a.phone || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
