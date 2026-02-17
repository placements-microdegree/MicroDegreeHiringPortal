import { useState } from "react";
import JDForm from "../../components/admin/JDForm";
import { createJob } from "../../services/jobService";

export default function PostJD() {
  const [message, setMessage] = useState("");

  const onSubmit = async (job) => {
    await createJob(job);
    setMessage("JD posted successfully.");
    setTimeout(() => setMessage(""), 2000);
  };

  return (
    <div className="space-y-4">
      {message ? (
        <div className="rounded-xl bg-green-50 p-3 text-sm text-green-700">
          {message}
        </div>
      ) : null}
      <JDForm onSubmit={onSubmit} />
    </div>
  );
}
