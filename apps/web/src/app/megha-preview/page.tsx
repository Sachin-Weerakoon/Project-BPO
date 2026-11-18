import CandidateProfile from '../../components/candidate/CandidateProfile';
import JobList from '../../components/jobs/JobList';
import type { CandidateProfile as CandidateData } from '../../types/candidate';
import type { Job } from '../../types/job';

// Fictional data for Cycle 1 UI demonstration. No API/database required.
const candidate: CandidateData = {
  fullName: 'Sample Candidate',
  headline: 'Remote Customer Support Specialist',
  location: 'Colombo, Sri Lanka',
  timezone: 'Asia/Colombo',
  languages: [
    { name: 'English', proficiency: 'advanced' },
    { name: 'Sinhala', proficiency: 'native' },
  ],
  skills: ['Customer support', 'Communication', 'Typing'],
  tools: ['Zendesk', 'Microsoft Excel'],
  processExperience: ['voice', 'non-voice'],
  experienceYears: 2,
  education: 'Undergraduate',
  preferredShifts: ['night', 'flexible'],
  remoteWorkspace: {
    quietSpace: true,
    internetSpeedMbps: 50,
    headset: true,
    webcam: true,
    powerBackup: false,
  },
  resumeFileName: 'sample-cv.pdf',
};

const jobs: Job[] = [
  {
    id: 'job-001',
    title: 'Remote Customer Support Agent',
    companyName: 'Example Support Solutions',
    location: 'Sri Lanka',
    remote: true,
    processType: 'voice',
    requiredLanguages: ['English'],
    shift: 'Night shift',
    timezone: 'EST',
    employmentType: 'full-time',
    salaryLabel: 'Salary negotiable',
    postedAtLabel: 'Demo job',
    description: 'Support international customers remotely.',
  },
  {
    id: 'job-002',
    title: 'Data Entry Specialist',
    companyName: 'Example Data Services',
    location: 'Remote',
    remote: true,
    processType: 'data-entry',
    requiredLanguages: ['English'],
    shift: 'Flexible',
    timezone: 'GMT',
    employmentType: 'part-time',
    salaryLabel: 'Negotiable',
    postedAtLabel: 'Demo job',
  },
];

export default function MeghaPreviewPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">Cycle 1 · Day 1–2</p>
          <h1 className="text-3xl font-bold">RemoteBPO Hub — Candidate UI Preview</h1>
          <p className="text-slate-600">Sample data only. Candidate profile, job card and job list components.</p>
        </header>
        <CandidateProfile profile={candidate} />
        <JobList jobs={jobs} />
      </div>
    </main>
  );
}
