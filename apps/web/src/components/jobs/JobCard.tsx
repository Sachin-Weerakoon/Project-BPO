import type { ReactNode } from "react";
import type { Job } from "../../types/job";

interface JobCardProps {
  job: Job;
  actions?: ReactNode;
}

/** Shared display-only job card. Search, save, and apply state belongs to its parent. */
export default function JobCard({ job, actions }: JobCardProps) {
  const initials = job.companyName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <article className="group flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm motion-safe:transition-[transform,box-shadow,border-color] motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg hover:shadow-slate-200/60" aria-label={`${job.title} at ${job.companyName}`}>
      <header className="flex items-start gap-3">
        <div aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl border border-teal-100 bg-teal-50 text-sm font-bold tracking-tight text-teal-800">
          {initials || "BP"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold tracking-wide text-teal-700">{job.companyName}</p>
          <h3 className="mt-1 text-[17px] font-semibold leading-snug tracking-tight text-slate-900">{job.title}</h3>
          <p className="mt-1 text-sm text-slate-500">{job.location} <span aria-hidden="true">·</span> {job.remote ? "Remote" : "On-site"}</p>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <span className="rounded-md bg-teal-50 px-2.5 py-1 text-xs font-medium capitalize text-teal-800">{job.processType.replaceAll("-", " ")}</span>
        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">{job.employmentType.replaceAll("-", " ")}</span>
        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{job.shift}</span>
      </div>

      {job.description && <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">{job.description}</p>}

      <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-[13px] leading-5">
        <div className="flex gap-2"><dt className="w-20 shrink-0 text-slate-500">Languages</dt><dd className="font-medium text-slate-800">{job.requiredLanguages.join(", ") || "Not specified"}</dd></div>
        <div className="flex gap-2"><dt className="w-20 shrink-0 text-slate-500">Timezone</dt><dd className="font-medium text-slate-800">{job.timezone}</dd></div>
        <div className="flex gap-2"><dt className="w-20 shrink-0 text-slate-500">Salary</dt><dd className="font-medium text-slate-800">{job.salaryLabel || "Not specified"}</dd></div>
      </dl>

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
        <span className="text-xs text-slate-500">{job.postedAtLabel ?? ""}</span>
        <div className="flex flex-wrap items-center gap-2">{actions ?? <span className="text-xs text-slate-500">Job preview</span>}</div>
      </footer>
    </article>
  );
}
