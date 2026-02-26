import { ROLES } from "./constants";

export function isStudentProfileComplete(profile, user) {
  if (!user || user.role !== ROLES.STUDENT) return true; // Only enforce for students
  if (!profile) return false;
  const hasName = Boolean(profile.fullName && profile.fullName.trim());
  const hasPhone = Boolean(profile.phone && profile.phone.trim());
  return hasName && hasPhone;
}
