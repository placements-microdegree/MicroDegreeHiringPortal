import { useParams } from "react-router-dom";
import ManageApplicationsByJobView from "../../components/admin/ManageApplicationsByJobView";

export default function ManageApplications() {
  const { jobId } = useParams();

  return (
    <ManageApplicationsByJobView
      basePath="/admin/manage-applications"
      selectedJobId={jobId}
    />
  );
}
