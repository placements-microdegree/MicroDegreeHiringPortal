import { useEffect, useState } from "react";
import StudentsTable from "../../components/admin/StudentsTable";
import { listStudents } from "../../services/adminService";

export default function Students() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    listStudents().then(setRows);
  }, []);

  const mapped = rows.map((r) => ({
    fullName: r.full_name || r.fullName,
    email: r.email,
    location: r.location,
    phone: r.phone,
    isEligible: r.is_eligible || r.isEligible,
    eligibleUntil: r.eligible_until || r.eligibleUntil,
    resumeUrl: r.resume_url || r.resumeUrl,
  }));

  return <StudentsTable rows={mapped} />;
}
