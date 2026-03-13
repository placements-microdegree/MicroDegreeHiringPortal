const ROLES = {
  STUDENT: "STUDENT",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
};

const APPLICATION_STATUSES = [
  "Applied",
  "Shortlisted",
  "Interview",
  "Selected",
  "Resume Screening Rejected", // For applications rejected by the system (e.g., ineligible) but not by the admin
  "Profile Mapped for client",
  "Client Rejected", // For applications rejected by the client
  "Rejected", // For applications rejected by the admin
];

module.exports = {
  ROLES,
  APPLICATION_STATUSES,
};
