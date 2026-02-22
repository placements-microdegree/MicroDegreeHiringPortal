import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import ResumeUpload from "../../components/student/ResumeUpload";
import SkillSelector from "../../components/student/SkillSelector";
import { useAuth } from "../../context/authStore";
import { ROLES } from "../../utils/constants";
import {
  listMyResumes,
  uploadResumes,
  deleteResume,
} from "../../services/resumeService";
import { isStudentProfileComplete } from "../../utils/profileChecks";
import { uploadProfilePhoto } from "../../services/profileService";
import { showError } from "../../utils/alerts";

export default function CompleteProfile() {
  const navigate = useNavigate();
  const { user, profile, updateProfile } = useAuth();

  const initial = useMemo(() => {
    const p = profile || {};
    return {
      fullName: p.fullName || "",
      email: p.email || user?.email || "",
      phone: p.phone || "",
      role: user?.role || p.role || ROLES.STUDENT,
      location: p.location || "",
      skills: p.skills || [],
      experienceLevel: p.experienceLevel || "Fresher",
      experienceYears: p.experienceYears || "",
      currentCTC: p.currentCTC || "",
      expectedCTC: p.expectedCTC || "",
      profilePhotoUrl: p.profilePhotoUrl || "",
      resumes: p.resumes || [],
    };
  }, [profile, user]);

  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  useEffect(() => {
    // Pull existing resumes when the page loads so validation reflects reality.
    refreshResumes();
  }, []);

  const refreshResumes = async () => {
    try {
      const rows = await listMyResumes();
      update({ resumes: rows });
    } catch {
      // ignore
    }
  };

  const update = (patch) => {
    setForm((p) => ({ ...p, ...patch }));
    const key = Object.keys(patch || {})[0];
    if (key) {
      setFieldErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const onPickPhoto = (file) => {
    if (!file) return;
    setPhotoUploading(true);
    uploadProfilePhoto(file)
      .then(({ url }) => {
        update({ profilePhotoUrl: url });
      })
      .catch(() => {
        update({ profilePhotoUrl: URL.createObjectURL(file) });
      })
      .finally(() => setPhotoUploading(false));
  };

  const onUploadResumes = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploaded = await uploadResumes(files);
      update({ resumes: uploaded });
      await refreshResumes();
    } catch (err) {
      await showError(err?.message || "Failed to upload resumes", "Upload Failed");
    } finally {
      setUploading(false);
    }
  };

  const onDeleteResume = async (resume) => {
    if (!resume?.id) return;
    setUploading(true);
    try {
      await deleteResume(resume.id);
      const rows = await listMyResumes();
      update({ resumes: rows });
    } catch (err) {
      await showError(err?.message || "Failed to delete resume", "Delete Failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    const nextErrors = {};
    if (!form.fullName?.trim()) nextErrors.fullName = "Full name is required";
    if (!form.phone?.trim()) nextErrors.phone = "Phone number is required";
    if (!form.skills?.length) nextErrors.skills = "Select at least one skill";
    if (!form.resumes?.length) {
      nextErrors.resumes = "Upload at least one resume";
    }

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }

    setSaving(true);
    try {
      const saved = await updateProfile(form);
      const complete = isStudentProfileComplete(saved, { role: saved.role });
      navigate(
        saved.role === ROLES.ADMIN || complete
          ? saved.role === ROLES.ADMIN
            ? "/admin/dashboard"
            : "/student/dashboard"
          : "/complete-profile",
      );
    } catch (err) {
      await showError(err?.message || "Failed to save profile", "Save Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-bgLight p-6">
      <div className="mx-auto w-[1040px]">
        <div className="rounded-xl bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xl font-semibold text-slate-900">
                Complete Profile
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Add your details to unlock placements.
              </div>
            </div>
            <div className="rounded-xl bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
              {form.role}
            </div>
          </div>

          <form onSubmit={save} className="mt-6 grid grid-cols-2 gap-5">
            <div className="col-span-2 rounded-xl border border-slate-200 bg-bgLight p-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-full bg-slate-200">
                  {form.profilePhotoUrl ? (
                    <img
                      src={form.profilePhotoUrl}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <label className="text-sm font-medium text-slate-700">
                  Profile Photo Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="mt-2 block w-full text-sm"
                    onChange={(e) => onPickPhoto(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>

            <Input
              label="Full Name"
              value={form.fullName}
              error={fieldErrors.fullName}
              onChange={(e) => update({ fullName: e.target.value })}
            />
            <Input
              label="Email"
              value={form.email}
              onChange={(e) => update({ email: e.target.value })}
              type="email"
            />
            <Input
              label="Location"
              value={form.location}
              onChange={(e) => update({ location: e.target.value })}
            />
            <Input
              label="Phone"
              value={form.phone}
              error={fieldErrors.phone}
              onChange={(e) => update({ phone: e.target.value })}
            />

            <div className="col-span-2">
              <div className="mb-2 text-sm font-medium text-slate-700">
                Skills
              </div>
              <SkillSelector
                selected={form.skills}
                onChange={(skills) => update({ skills })}
              />
              {fieldErrors.skills ? (
                <div className="mt-1 text-xs text-red-600">
                  {fieldErrors.skills}
                </div>
              ) : null}
            </div>

            <div className="col-span-2 rounded-xl border border-slate-200 p-4">
              <div className="text-sm font-semibold text-slate-900">
                Experience
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  variant={
                    form.experienceLevel === "Experienced"
                      ? "primary"
                      : "outline"
                  }
                  type="button"
                  onClick={() => update({ experienceLevel: "Experienced" })}
                >
                  Experienced
                </Button>
                <Button
                  variant={
                    form.experienceLevel === "Fresher" ? "primary" : "outline"
                  }
                  type="button"
                  onClick={() => update({ experienceLevel: "Fresher" })}
                >
                  Fresher
                </Button>
              </div>

              {form.experienceLevel === "Experienced" ? (
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <Input
                    label="Experience years"
                    value={form.experienceYears}
                    onChange={(e) =>
                      update({ experienceYears: e.target.value })
                    }
                  />
                  <Input
                    label="Current CTC"
                    value={form.currentCTC}
                    onChange={(e) => update({ currentCTC: e.target.value })}
                  />
                  <Input
                    label="Expected CTC"
                    value={form.expectedCTC}
                    onChange={(e) => update({ expectedCTC: e.target.value })}
                  />
                </div>
              ) : (
                <div className="mt-4 w-1/2">
                  <Input
                    label="Expected CTC only"
                    value={form.expectedCTC}
                    onChange={(e) => update({ expectedCTC: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="col-span-2">
              <ResumeUpload
                resumes={form.resumes}
                onUpload={onUploadResumes}
                onDelete={onDeleteResume}
              />
              {fieldErrors.resumes ? (
                <div className="mt-1 text-xs text-red-600">
                  {fieldErrors.resumes}
                </div>
              ) : null}
            </div>

            <div className="col-span-2">
              <Button
                type="submit"
                className="w-full"
                disabled={saving || uploading || photoUploading}
              >
                {saving
                  ? "Saving..."
                  : uploading
                    ? "Uploading resumes..."
                    : photoUploading
                      ? "Uploading photo..."
                      : "Save & Continue"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
