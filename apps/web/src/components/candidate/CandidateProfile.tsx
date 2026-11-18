import type { ReactNode } from 'react';
import type { CandidateProfile as CandidateProfileData } from '../../types/candidate';

interface CandidateProfileProps {
  profile: CandidateProfileData;
}

function Pill({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{children}</span>;
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 border-t border-slate-200 pt-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {children}
    </section>
  );
}
export default function CandidateProfile({ profile }: CandidateProfileProps) {
  const workspace = [
    ['Quiet workspace', profile.remoteWorkspace.quietSpace],
    ['Headset', profile.remoteWorkspace.headset],
    ['Webcam', profile.remoteWorkspace.webcam],
    ['Power backup', profile.remoteWorkspace.powerBackup],
  ] as const;
  return (
    <article className="mx-auto w-full max-w-3xl space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8" aria-label="Candidate profile preview">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Candidate profile</p>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">{profile.fullName}</h2>
        {profile.headline && <p className="text-slate-600">{profile.headline}</p>}
        <p className="text-sm text-slate-500">{profile.location} · {profile.timezone}</p>
      </header>
      <Section title="Languages">
        <div className="flex flex-wrap gap-2">{profile.languages.map((item, index) => <Pill key={`${item.name}-${index}`}>{item.name} · {item.proficiency}</Pill>)}</div>
      </Section>
      <Section title="Skills & tools">
        <div className="flex flex-wrap gap-2">{[...profile.skills, ...profile.tools].map((item, index) => <Pill key={`${item}-${index}`}>{item}</Pill>)}</div>
      </Section>
      <Section title="BPO experience">
        <p className="text-sm text-slate-700">{profile.experienceYears ?? 0} years experience</p>
        <div className="flex flex-wrap gap-2">{profile.processExperience.map((item) => <Pill key={item}>{item.replaceAll('-', ' ')}</Pill>)}</div>
        {profile.education && <p className="text-sm text-slate-600">Education: {profile.education}</p>}
      </Section>
      <Section title="Preferred shifts">
        <div className="flex flex-wrap gap-2">{profile.preferredShifts.map((shift) => <Pill key={shift}>{shift}</Pill>)}</div>
      </Section>
      <Section title="Remote workspace readiness">
        <ul className="grid gap-2 sm:grid-cols-2">{workspace.map(([label, available]) => <li key={label} className="text-sm text-slate-700">{available ? '✓' : '–'} {label}</li>)}</ul>
        <p className="text-sm text-slate-600">Internet speed: {profile.remoteWorkspace.internetSpeedMbps == null ? 'Not provided' : `${profile.remoteWorkspace.internetSpeedMbps} Mbps`}</p>
        {profile.resumeFileName && <p className="text-sm text-slate-600">Resume: {profile.resumeFileName}</p>}
      </Section>
    </article>
  );
}
