import { SKILLS } from "../../utils/constants";

export default function SkillSelector({ selected = [], onChange }) {
  const toggle = (skill) => {
    const next = selected.includes(skill)
      ? selected.filter((s) => s !== skill)
      : [...selected, skill];
    onChange?.(next);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {SKILLS.map((skill) => {
        const active = selected.includes(skill);
        return (
          <button
            key={skill}
            type="button"
            onClick={() => toggle(skill)}
            className={
              "rounded-full border px-3 py-1 text-sm transition " +
              (active
                ? "border-primary bg-primary/10 text-primary"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")
            }
          >
            {skill}
          </button>
        );
      })}
    </div>
  );
}
