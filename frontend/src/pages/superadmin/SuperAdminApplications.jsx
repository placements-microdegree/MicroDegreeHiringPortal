import { useParams } from "react-router-dom";
import ManageApplicationsByJobView from "../../components/admin/ManageApplicationsByJobView";

export default function SuperAdminApplications() {
  const { jobId } = useParams();

  return (
    <ManageApplicationsByJobView
      basePath="/superadmin/applications"
      selectedJobId={jobId}
    />
  );
}
