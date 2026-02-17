import { useEffect, useState } from "react";
import JobCard from "../../components/student/JobCard";
import { listJobs } from "../../services/jobService";

export default function SuperAdminJobs() {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    listJobs().then(setJobs);
  }, []);

  return (
    <div className="grid grid-cols-2 gap-6">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} applied />
      ))}
    </div>
  );
}
