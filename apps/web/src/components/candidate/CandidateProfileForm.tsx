"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import type { BpoProcessType, CandidateProfile, Proficiency, ShiftPreference } from "../../types/candidate";

type WorkspaceKey = "quietSpace" | "headset" | "webcam" | "powerBackup";
const processes: { value: BpoProcessType; label: string }[] = [
  { value: "voice", label: "Voice" }, { value: "non-voice", label: "Non-voice" },
  { value: "technical-support", label: "Technical support" }, { value: "data-entry", label: "Data entry" },
  { value: "content-moderation", label: "Content moderation" }, { value: "healthcare-bpo", label: "Healthcare BPO" },
  { value: "finance-bpo", label: "Finance BPO" }, { value: "other", label: "Other" },
];
const shifts: { value: ShiftPreference; label: string }[] = [
  { value: "day", label: "Day" }, { value: "night", label: "Night" },
  { value: "rotational", label: "Rotational" }, { value: "weekend", label: "Weekend" },
  { value: "flexible", label: "Flexible" },
];
const workspaceFields: { value: WorkspaceKey; label: string }[] = [
  { value: "quietSpace", label: "Quiet workspace" }, { value: "headset", label: "Headset" },
  { value: "webcam", label: "Webcam" }, { value: "powerBackup", label: "Power backup" },
];
const proficiencyOptions: Proficiency[] = ["basic", "intermediate", "advanced", "native"];
const initialProfile: CandidateProfile = {
  fullName: "", location: "", timezone: "Asia/Colombo", education: "", experienceYears: 0,
  languages: [{ name: "English", proficiency: "intermediate" }], skills: [], tools: [],
  processExperience: [], preferredShifts: [],
  remoteWorkspace: { quietSpace: false, headset: false, webcam: false, powerBackup: false },
};
const inputClass = "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-100";
const buttonClass = "rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700";
function formatList(raw: string): string[] { return [...new Set(raw.split(",").map((item) => item.trim()).filter(Boolean))]; }
function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="border-b border-slate-200 pb-6 last:border-b-0 last:pb-0">
    <h3 className="mb-4 text-base font-semibold text-slate-900">{title}</h3>{children}
  </section>;
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm font-medium text-slate-700">{label}{children}</label>;
}
function CheckOption({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
    <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-teal-700" />{label}
  </label>;
}
function ReviewRow({ label, value }: { label: string; value: ReactNode }) {
  return <div className="grid gap-1 py-2 sm:grid-cols-[170px_minmax(0,1fr)] sm:gap-4">
    <dt className="text-sm text-slate-500">{label}</dt><dd className="text-sm font-medium text-slate-800">{value || "Not provided"}</dd>
  </div>;
}

export default function CandidateProfileForm() {
  const [profile, setProfile] = useState<CandidateProfile>(initialProfile);
  const [skillsText, setSkillsText] = useState("");
  const [toolsText, setToolsText] = useState("");
  const [availability, setAvailability] = useState(""); // Local UI note pending API field agreement.
  const [resumeName, setResumeName] = useState(""); // File name only; no upload occurs.
  const [review, setReview] = useState<CandidateProfile | null>(null);
  const [error, setError] = useState("");
  const update = <K extends keyof CandidateProfile>(key: K, value: CandidateProfile[K]) =>
    setProfile((current) => ({ ...current, [key]: value }));
  const toggleProcess = (value: BpoProcessType) => setProfile((current) => ({ ...current,
    processExperience: current.processExperience.includes(value)
      ? current.processExperience.filter((item) => item !== value) : [...current.processExperience, value],
  }));
  const toggleShift = (value: ShiftPreference) => setProfile((current) => ({ ...current,
    preferredShifts: current.preferredShifts.includes(value)
      ? current.preferredShifts.filter((item) => item !== value) : [...current.preferredShifts, value],
  }));
  const toggleWorkspace = (key: WorkspaceKey) => setProfile((current) => ({ ...current,
    remoteWorkspace: { ...current.remoteWorkspace, [key]: !current.remoteWorkspace[key] },
  }));
  function handleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const updated: CandidateProfile = { ...profile, fullName: profile.fullName.trim(),
      location: profile.location.trim(), timezone: profile.timezone.trim(),
      languages: profile.languages.map((language) => ({ ...language, name: language.name.trim() })).filter((language) => language.name),
      skills: formatList(skillsText), tools: formatList(toolsText),
      resumeFileName: resumeName || undefined,
    };
    if (!updated.fullName || !updated.location || !updated.timezone || !updated.languages.length || !updated.preferredShifts.length) {
      setError("Please complete your name, location, timezone, at least one language and one preferred shift."); return;
    }
    if (!Number.isFinite(updated.experienceYears ?? 0) || (updated.experienceYears ?? 0) < 0 ||
        !Number.isFinite(updated.remoteWorkspace.internetSpeedMbps ?? 0) || (updated.remoteWorkspace.internetSpeedMbps ?? 0) < 0) {
      setError("Experience and internet speed must be valid non-negative numbers."); return;
    }
    setError(""); setReview(updated);
  }
  return <div className="mx-auto w-full max-w-4xl text-slate-900">
    <div className="mb-5"><h2 className="text-2xl font-bold tracking-tight">Candidate profile</h2>
      <p className="mt-1 text-sm text-slate-600">Add your details for remote BPO opportunities.</p></div>
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      {review ? <div aria-label="Profile review">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div><h3 className="text-lg font-semibold">Review profile</h3><p className="mt-1 text-sm text-slate-500">Preview only — not saved to a database.</p></div>
          <button type="button" onClick={() => setReview(null)} className={buttonClass}>Edit profile</button>
        </div>
        <dl className="divide-y divide-slate-100">
          <ReviewRow label="Full name" value={review.fullName} />
          <ReviewRow label="Location" value={review.location} />
          <ReviewRow label="Timezone" value={review.timezone} />
          <ReviewRow label="Education" value={review.education} />
          <ReviewRow label="Experience" value={`${review.experienceYears ?? 0} years`} />
          <ReviewRow label="Languages" value={review.languages.map((item) => `${item.name} (${item.proficiency})`).join(", ")} />
          <ReviewRow label="Skills" value={review.skills.join(", ")} />
          <ReviewRow label="Tools" value={review.tools.join(", ")} />
          <ReviewRow label="BPO experience" value={review.processExperience.map((item) => item.replaceAll("-", " ")).join(", ")} />
          <ReviewRow label="Preferred shifts" value={review.preferredShifts.join(", ")} />
          <ReviewRow label="Availability" value={availability} />
          <ReviewRow label="Internet speed" value={review.remoteWorkspace.internetSpeedMbps === undefined ? "Not provided" : `${review.remoteWorkspace.internetSpeedMbps} Mbps`} />
          {workspaceFields.map(({ value, label }) => <ReviewRow key={value} label={label} value={review.remoteWorkspace[value] ? "Yes" : "No"} />)}
          <ReviewRow label="Resume" value={resumeName ? `${resumeName} (not uploaded)` : "Not selected"} />
        </dl>
      </div> : <form onSubmit={handleReview} noValidate className="space-y-6">
        <Section title="Personal details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name *"><input className={inputClass} value={profile.fullName} autoComplete="name" onChange={(event) => update("fullName", event.target.value)} placeholder="Full name" /></Field>
            <Field label="Location *"><input className={inputClass} value={profile.location} onChange={(event) => update("location", event.target.value)} placeholder="City, country" /></Field>
            <Field label="Timezone *"><input className={inputClass} value={profile.timezone} onChange={(event) => update("timezone", event.target.value)} placeholder="Asia/Colombo" /></Field>
            <Field label="Education"><input className={inputClass} value={profile.education ?? ""} onChange={(event) => update("education", event.target.value)} placeholder="Highest qualification" /></Field>
            <Field label="Experience (years)"><input type="number" min="0" max="60" className={inputClass} value={profile.experienceYears ?? 0} onChange={(event) => update("experienceYears", event.target.value === "" ? 0 : Number(event.target.value))} /></Field>
          </div>
        </Section>
        <Section title="Languages, skills & tools">
          <fieldset><legend className="mb-2 text-sm font-medium text-slate-700">Languages & proficiency *</legend>
            <div className="space-y-2">{profile.languages.map((language, index) => <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <label className="sr-only" htmlFor={`language-${index}`}>Language {index + 1}</label>
              <input id={`language-${index}`} className={`${inputClass} mt-0`} value={language.name} placeholder="Language" onChange={(event) => update("languages", profile.languages.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} />
              <label className="sr-only" htmlFor={`proficiency-${index}`}>Proficiency {index + 1}</label>
              <select id={`proficiency-${index}`} className={`${inputClass} mt-0`} value={language.proficiency} onChange={(event) => update("languages", profile.languages.map((item, i) => i === index ? { ...item, proficiency: event.target.value as Proficiency } : item))}>
                {proficiencyOptions.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}
              </select>
              <button type="button" onClick={() => update("languages", profile.languages.filter((_, i) => i !== index))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">Remove</button>
            </div>)}</div>
            <button type="button" className="mt-3 text-sm font-semibold text-teal-700 hover:underline" onClick={() => update("languages", [...profile.languages, { name: "", proficiency: "basic" }])}>+ Add language</button>
          </fieldset>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Skills"><input className={inputClass} value={skillsText} onChange={(event) => setSkillsText(event.target.value)} placeholder="Customer service, data entry" /></Field>
            <Field label="Tools"><input className={inputClass} value={toolsText} onChange={(event) => setToolsText(event.target.value)} placeholder="Zendesk, Excel" /></Field>
          </div><p className="mt-2 text-xs text-slate-500">Separate skills and tools with commas.</p>
          <fieldset className="mt-4"><legend className="mb-2 text-sm font-medium text-slate-700">BPO process experience</legend>
            <div className="grid gap-2 sm:grid-cols-2">{processes.map(({ value, label }) => <CheckOption key={value} label={label} checked={profile.processExperience.includes(value)} onChange={() => toggleProcess(value)} />)}</div>
          </fieldset>
        </Section>
        <Section title="Work preferences">
          <fieldset><legend className="mb-2 text-sm font-medium text-slate-700">Preferred shifts *</legend>
            <div className="grid gap-2 sm:grid-cols-2">{shifts.map(({ value, label }) => <CheckOption key={value} label={label} checked={profile.preferredShifts.includes(value)} onChange={() => toggleShift(value)} />)}</div>
          </fieldset>
          <div className="mt-4"><Field label="Availability window (optional)"><input className={inputClass} value={availability} onChange={(event) => setAvailability(event.target.value)} placeholder="Mon–Fri, 6 PM–11 PM" /></Field></div>
        </Section>
        <Section title="Remote workspace readiness">
          <div className="grid gap-2 sm:grid-cols-2">{workspaceFields.map(({ value, label }) => <CheckOption key={value} label={label} checked={profile.remoteWorkspace[value]} onChange={() => toggleWorkspace(value)} />)}</div>
          <div className="mt-4 max-w-xs"><Field label="Internet speed (Mbps)"><input type="number" min="0" step="0.1" className={inputClass} value={profile.remoteWorkspace.internetSpeedMbps ?? ""} onChange={(event) => update("remoteWorkspace", { ...profile.remoteWorkspace, internetSpeedMbps: event.target.value === "" ? undefined : Number(event.target.value) })} placeholder="e.g. 50" /></Field></div>
        </Section>
        <Section title="Resume">
          <label htmlFor="candidate-resume" className="block text-sm font-medium text-slate-700">Select resume (PDF, DOC, DOCX)</label>
          <input id="candidate-resume" type="file" accept=".pdf,.doc,.docx" className="mt-2 block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700" onChange={(event) => setResumeName(event.target.files?.[0]?.name ?? "")} />
          <p className="mt-2 text-xs text-slate-500">Local selection only. No file is uploaded or stored.</p>
        </Section>
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">* Required fields · Demo only, not saved</p><button type="submit" className={buttonClass}>Review profile</button></div>
      </form>}
    </div>
  </div>;
}
