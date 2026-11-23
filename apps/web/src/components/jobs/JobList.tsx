import type { ReactNode } from "react";
import type { Job } from "../../types/job";
import JobCard from "./JobCard";
import styles from "./JobExperience.module.css";

interface JobListProps {
  jobs: Job[];
  title?: string;
  totalCount?: number;
  renderActions?: (job: Job) => ReactNode;
}

/** Reusable job list for Cycle 1, 2, and 3; parent owns filtering and pagination. */
export default function JobList({ jobs, title = "Remote BPO jobs", totalCount, renderActions }: JobListProps) {
  const count = totalCount ?? jobs.length;
  return (
    <section aria-label={title} className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
        <p aria-live="polite" className="text-sm text-slate-500">{count} {count === 1 ? "job" : "jobs"} found</p>
      </div>
      {jobs.length === 0 ? (
        <div role="status" className="rounded-2xl border border-dashed border-slate-300 bg-white p-9 text-center text-sm text-slate-600">No jobs to display yet.</div>
      ) : (
        <div className={`grid gap-4 md:grid-cols-2 ${styles.contentEnter}`}>
          {jobs.map((job) => <JobCard key={job.id} job={job} actions={renderActions?.(job)} />)}
        </div>
      )}
    </section>
  );
}
