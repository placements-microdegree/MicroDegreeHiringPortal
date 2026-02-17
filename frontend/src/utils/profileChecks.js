import { ROLES } from "./constants";

export function isStudentProfileComplete(profile, user) {
  if (!user || user.role !== ROLES.STUDENT) return true; // Only enforce for students
  if (!profile) return false;
  const hasName = Boolean(profile.fullName && profile.fullName.trim());
  const hasPhone = Boolean(profile.phone && profile.phone.trim());
  const hasSkills = Array.isArray(profile.skills) && profile.skills.length > 0;
  const hasResumes =
    Array.isArray(profile.resumes) && profile.resumes.length > 0;
  return hasName && hasPhone && hasSkills && hasResumes;
}
