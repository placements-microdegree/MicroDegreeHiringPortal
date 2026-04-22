import { ROLES } from "./constants";

export function isStudentProfileComplete(profile, user) {
  if (!user || user.role !== ROLES.STUDENT) return true; // Only enforce for students
  if (!profile) return false;

  const hasName = Boolean(profile.fullName && profile.fullName.trim());
  const hasEmail = Boolean(profile.email && profile.email.trim());
  const hasPhone = Boolean(profile.phone && profile.phone.trim());
  const hasLocation = Boolean(profile.location && profile.location.trim());
  const hasPreferredLocation = Boolean(
    profile.preferredLocation && profile.preferredLocation.trim(),
  );
  const hasSkills = Array.isArray(profile.skills)
    ? profile.skills.filter((item) => String(item || "").trim()).length > 0
    : Boolean(String(profile.skills || "").trim());
  const hasExperienceLevel = Boolean(
    profile.experienceLevel && String(profile.experienceLevel).trim(),
  );

  return (
    hasName &&
    hasEmail &&
    hasPhone &&
    hasLocation &&
    hasPreferredLocation &&
    hasSkills &&
    hasExperienceLevel
  );
}
