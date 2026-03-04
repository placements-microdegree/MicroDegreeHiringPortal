import { useEffect, useMemo, useState } from "react";
import Button from "../common/Button";
import Input from "../common/Input";
import { uploadProfilePhoto } from "../../services/profileService";

function parseSkills(value) {
  if (Array.isArray(value)) {
    return value
      .map((skill) => String(skill || "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);
  }

  return [];
}

function mergeUniqueSkills(existing, incoming) {
  const seen = new Set();
  const merged = [];

  [...parseSkills(existing), ...parseSkills(incoming)].forEach((skill) => {
    const key = skill.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(skill);
  });

  return merged;
}

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
  const [skillsInput, setSkillsInput] = useState("");
  const [activeSkill, setActiveSkill] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => {
    setForm(initial);
    setSkillsInput("");
    setActiveSkill("");
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

  const saveSkillsToChips = () => {
    const parsedDraftSkills = parseSkills(skillsInput);
    if (parsedDraftSkills.length === 0) return;

    update({ skills: mergeUniqueSkills(form.skills, parsedDraftSkills) });
    setSkillsInput("");
    setActiveSkill("");
  };

  const savedSkills = parseSkills(form.skills);

  const removeSkillChip = (skillToRemove) => {
    const normalizedTarget = String(skillToRemove || "").trim().toLowerCase();
    if (!normalizedTarget) return;

    update({
      skills: savedSkills.filter(
        (skill) => String(skill).trim().toLowerCase() !== normalizedTarget,
      ),
    });

    if (String(activeSkill || "").trim().toLowerCase() === normalizedTarget) {
      setActiveSkill("");
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
            <Input
              value={skillsInput}
              onChange={(e) => {
                setSkillsInput(e.target.value);
              }}
              placeholder="e.g. React, Node, AWS"
            />
            <div className="mt-2 flex justify-end">
              <Button
                variant="outline"
                className="px-3 py-1.5 text-xs"
                onClick={saveSkillsToChips}
                disabled={parseSkills(skillsInput).length === 0}
              >
                Save Skills
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {savedSkills.length > 0 ? (
                savedSkills.map((skill) => {
                  const selected =
                    String(activeSkill || "").trim().toLowerCase() ===
                    String(skill || "").trim().toLowerCase();

                  return (
                    <div
                      key={skill}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition ${selected ? "bg-primary text-white" : "bg-primary/10 text-primary"}`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setActiveSkill((prev) =>
                            String(prev || "").trim().toLowerCase() ===
                            String(skill || "").trim().toLowerCase()
                              ? ""
                              : skill,
                          )
                        }
                        className="outline-none"
                      >
                        {skill}
                      </button>
                      {selected ? (
                        <button
                          type="button"
                          onClick={() => removeSkillChip(skill)}
                          aria-label={`Remove ${skill}`}
                          className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[11px] text-white transition hover:bg-white/30"
                        >
                          x
                        </button>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <span className="text-xs text-slate-500">
                  Add comma separated skills and click Save Skills.
                </span>
              )}
            </div>
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
