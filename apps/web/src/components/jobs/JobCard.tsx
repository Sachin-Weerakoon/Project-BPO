import type { Job } from '../../types/job';

interface JobCardProps { job: Job; }

export default function JobCard({ job }: JobCardProps) {
  return (
    <article className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md" aria-label={`${job.title} at ${job.companyName}`}>
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">{job.companyName}</p>
        <h3 className="text-lg font-bold text-slate-900">{job.title}</h3>
        <p className="text-sm text-slate-500">{job.location} · {job.remote ? 'Remote' : 'On-site'}</p>
      </header>
      <div className="flex flex-wrap gap-2 text-xs text-slate-700">
        <span className="rounded-full bg-teal-50 px-3 py-1 font-medium text-teal-800">{job.processType.replaceAll('-', ' ')}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1">{job.employmentType.replaceAll('-', ' ')}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1">{job.shift}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1">{job.timezone}</span>
      </div>
      <p className="text-sm text-slate-600">Languages: {job.requiredLanguages.join(', ') || 'Not specified'}</p>
      {job.description && <p className="line-clamp-2 text-sm text-slate-600">{job.description}</p>}
      <footer className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
        <div className="space-y-1 text-sm">
          {job.salaryLabel && <p className="font-semibold text-slate-800">{job.salaryLabel}</p>}
          {job.postedAtLabel && <p className="text-xs text-slate-500">{job.postedAtLabel}</p>}
        </div>
        <span className="text-xs font-medium text-teal-700">Details available in job page</span>
      </footer>
    </article>
  );
}
