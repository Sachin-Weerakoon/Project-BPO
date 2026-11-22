import type { Job } from "../types/job";

export interface JobFilters {
  keyword: string;
  process: string;
  language: string;
  shift: string;
}

/** Stable, case-insensitive filtering shared by the UI and the unit tests. */
export function filterJobs(jobs: Job[], criteria: JobFilters, savedIds: string[] = [], savedOnly = false): Job[] {
  const keyword = criteria.keyword.trim().toLowerCase();
  return jobs.filter((job) => {
    const haystack = [job.title, job.companyName, job.location, job.description ?? ""].join(" ").toLowerCase();
    return haystack.includes(keyword)
      && (!criteria.process || job.processType === criteria.process)
      && (!criteria.language || job.requiredLanguages.some((name) => name.toLowerCase() === criteria.language.toLowerCase()))
      && (!criteria.shift || job.shift.toLowerCase().includes(criteria.shift.toLowerCase()))
      && (!savedOnly || savedIds.includes(job.id));
  });
}

export function paginateJobs<T>(items: T[], requestedPage: number, pageSize: number) {
  const size = Math.max(1, Math.floor(pageSize));
  const pages = Math.max(1, Math.ceil(items.length / size));
  const page = Math.max(1, Math.min(Math.floor(requestedPage) || 1, pages));
  return { page, pages, items: items.slice((page - 1) * size, page * size) };
}
