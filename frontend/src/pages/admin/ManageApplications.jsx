import { useEffect, useState } from "react";
import ApplicationsTable from "../../components/admin/ApplicationsTable";
import {
  listAllApplications,
  updateApplicationStatus,
} from "../../services/applicationService";

export default function ManageApplications() {
  const [rows, setRows] = useState([]);

  const refresh = async () => {
    const all = await listAllApplications();
    setRows(all);
  };

  useEffect(() => {
    refresh();
  }, []);

  const onStatusChange = async (id, status) => {
    await updateApplicationStatus(id, status);
    await refresh();
  };

  const mapped = rows.map((r) => ({
    ...r,
    studentName: r.profiles?.full_name || r.studentName,
    studentPhone: r.profiles?.phone,
    studentEmail: r.profiles?.email,
    resumeUrl:
      r.profiles?.resumes?.[0]?.signed_url ||
      r.profiles?.resumes?.[0]?.file_url ||
      r.resumeUrl,
    jobTitle: r.jobs?.title || r.jobTitle,
  }));
  console.log(rows);
  return <ApplicationsTable rows={mapped} onStatusChange={onStatusChange} />;
}
