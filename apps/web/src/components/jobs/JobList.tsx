import JobCard from './JobCard';
import type { Job } from '../../types/job';

interface JobListProps {
  jobs: Job[];
  title?: string;
}

export default function JobList({ jobs, title = 'Remote BPO opportunities' }: JobListProps) {
  return (
    <section className="space-y-5" aria-label={title}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}</p>
      </div>
      {jobs.length === 0 ? (
        <div role="status" className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-600">No jobs to display yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => <JobCard key={job.id} job={job} />)}
        </div>
      )}
    </section>
  );
}
