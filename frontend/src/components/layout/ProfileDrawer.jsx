import { useEffect, useMemo, useState } from "react";
import Button from "../common/Button";
import Input from "../common/Input";
import SkillSelector from "../student/SkillSelector";
import { uploadProfilePhoto } from "../../services/profileService";

export default function ProfileDrawer({ open, onClose, profile, onSave }) {
  const initial = useMemo(
    () =>
      profile || {
        fullName: "",
        email: "",
        phone: "",
        role: "",
        location: "",
        skills: [],
        experienceLevel: "Fresher",
        experienceYears: "",
        currentCTC: "",
        expectedCTC: "",
        profilePhotoUrl: "",
      },
    [profile],
  );

  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  if (!open) return null;

  const update = (patch) => setForm((p) => ({ ...p, ...patch }));

  const onPickPhoto = async (file) => {
    if (!file) return;
    setPhotoUploading(true);
    try {
      const { url } = await uploadProfilePhoto(file);
      const next = {
        ...form,
        profilePhotoUrl: url,
      };
      update(next);
      if (onSave) {
        await onSave(next);
      }
    } catch {
      update({ profilePhotoUrl: URL.createObjectURL(file) });
    } finally {
      setPhotoUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-sm sm:w-[420px]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="text-base font-semibold text-slate-900">
            Edit Profile
          </div>
          <Button variant="subtle" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-bgLight p-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 overflow-hidden rounded-full bg-slate-200">
                {form.profilePhotoUrl ? (
                  <img
                    src={form.profilePhotoUrl}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <label className="text-sm font-medium text-slate-700">
                Profile Photo
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
            label="Location"
            value={form.location}
            onChange={(e) => update({ location: e.target.value })}
          />

          <div>
            <div className="mb-2 text-sm font-medium text-slate-700">
              Skills
            </div>
            <SkillSelector
              selected={form.skills}
              onChange={(skills) => update({ skills })}
            />
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-sm font-semibold text-slate-900">
              Experience
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                variant={
                  form.experienceLevel === "Experienced" ? "primary" : "outline"
                }
                onClick={() => update({ experienceLevel: "Experienced" })}
              >
                Experienced
              </Button>
              <Button
                variant={
                  form.experienceLevel === "Fresher" ? "primary" : "outline"
                }
                onClick={() => update({ experienceLevel: "Fresher" })}
              >
                Fresher
              </Button>
            </div>

            {form.experienceLevel === "Experienced" ? (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Input
                  label="Experience Years"
                  value={form.experienceYears}
                  onChange={(e) => update({ experienceYears: e.target.value })}
                />
                <Input
                  label="Current CTC"
                  value={form.currentCTC}
                  onChange={(e) => update({ currentCTC: e.target.value })}
                />
                <Input
                  label="Expected CTC"
                  className="col-span-2"
                  value={form.expectedCTC}
                  onChange={(e) => update({ expectedCTC: e.target.value })}
                />
              </div>
            ) : (
              <div className="mt-4">
                <Input
                  label="Expected CTC"
                  value={form.expectedCTC}
                  onChange={(e) => update({ expectedCTC: e.target.value })}
                />
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-200 px-5 py-4 space-y-3">
          <Button
            className="w-full"
            onClick={save}
            disabled={saving || photoUploading}
          >
            {saving
              ? "Saving..."
              : photoUploading
                ? "Uploading photo..."
                : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
