import { useState } from "react";
import Button from "../common/Button";
import Input from "../common/Input";
import SkillSelector from "../student/SkillSelector";

export default function JDForm({ onSubmit }) {
  const [form, setForm] = useState({
    title: "",
    company: "",
    description: "",
    skills: [],
    location: "",
    ctc: "",
  });
  const [saving, setSaving] = useState(false);

  const update = (patch) => setForm((p) => ({ ...p, ...patch }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit?.(form);
      setForm({
        title: "",
        company: "",
        description: "",
        skills: [],
        location: "",
        ctc: "",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-xl bg-white p-5">
      <div className="text-base font-semibold text-slate-900">
        Post Job Description
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <Input
          label="Title"
          value={form.title}
          onChange={(e) => update({ title: e.target.value })}
          required
        />
        <Input
          label="Company"
          value={form.company}
          onChange={(e) => update({ company: e.target.value })}
          required
        />
        <label className="col-span-2 block">
          <div className="mb-1 text-sm font-medium text-slate-700">
            Description
          </div>
          <textarea
            className="min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
            value={form.description}
            onChange={(e) => update({ description: e.target.value })}
            required
          />
        </label>

        <div className="col-span-2">
          <div className="mb-2 text-sm font-medium text-slate-700">Skills</div>
          <SkillSelector
            selected={form.skills}
            onChange={(skills) => update({ skills })}
          />
        </div>

        <Input
          label="Location"
          value={form.location}
          onChange={(e) => update({ location: e.target.value })}
          required
        />
        <Input
          label="CTC"
          value={form.ctc}
          onChange={(e) => update({ ctc: e.target.value })}
          required
        />
      </div>

      <div className="mt-5">
        <Button type="submit" disabled={saving}>
          {saving ? "Posting..." : "Post JD"}
        </Button>
      </div>
    </form>
  );
}
