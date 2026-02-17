const truthy = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
};

export function calculateProfileCompletion(profile) {
  const fields = [
    profile?.fullName,
    profile?.email,
    profile?.phone,
    profile?.location,
    profile?.skills,
    profile?.experienceLevel,
    profile?.expectedCTC,
    profile?.profilePhotoUrl,
    profile?.resumes,
  ];

  const filled = fields.filter(truthy).length;
  return Math.round((filled / fields.length) * 100);
}
