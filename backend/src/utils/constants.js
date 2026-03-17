const ROLES = {
  STUDENT: "STUDENT",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
};

const APPLICATION_STATUSES = [
  "Applied",
  "Shortlisted",
  "Interview Scheduled",
  "Interview Not Cleared",
  "Technical Round",
  "Final Round",
  "Placed",
  "Position Closed",
  "Resume Screening Rejected", // For applications rejected by the system (e.g., ineligible) but not by the admin
  "Profile Mapped for client",
  "Client Rejected", // For applications rejected by the client
  "Rejected", // For applications rejected by the admin
  // Legacy values kept for backward compatibility with existing rows
  "Interview",
  "Selected",
];

module.exports = {
  ROLES,
  APPLICATION_STATUSES,
};
