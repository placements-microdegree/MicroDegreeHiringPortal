import { useEffect, useState } from "react";
import ApplicationsTable from "../../components/admin/ApplicationsTable";
import {
  listAllApplications,
  updateApplicationStatus,
} from "../../services/applicationService";

export default function SuperAdminApplications() {
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

  const mapped = rows.map((r) => {
    const resume =
      r.profiles?.resumes?.[0] ||
      r.resumes?.[0] ||
      (Array.isArray(r.profiles?.resumes) ? r.profiles.resumes[0] : null);
    return {
      ...r,
      studentName: r.profiles?.full_name || r.studentName,
      studentPhone: r.profiles?.phone,
      studentEmail: r.profiles?.email,
      resumeUrl:
        resume?.signed_url || resume?.file_url || resume?.url || resume?.public_url,
      jobTitle: r.jobs?.title || r.jobTitle,
    };
  });

  return <ApplicationsTable rows={mapped} onStatusChange={onStatusChange} />;
}
