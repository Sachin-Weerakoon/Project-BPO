"use client";

import { useMemo, useState } from "react";
import JobList from "./JobList";
import type { Job } from "../../types/job";
import type { BpoProcessType } from "../../types/candidate";

// Local samples only. Replace with the agreed Job API during integration.
const sampleJobs: Job[] = [
  { id: "demo-1", title: "Remote Customer Support Agent", companyName: "Sample Support Services", location: "Sri Lanka", remote: true, processType: "voice", requiredLanguages: ["English"], shift: "Night shift", timezone: "EST", employmentType: "full-time", salaryLabel: "Negotiable", postedAtLabel: "Demo" },
  { id: "demo-2", title: "Data Entry Specialist", companyName: "Sample Data Operations", location: "Remote", remote: true, processType: "data-entry", requiredLanguages: ["English", "Sinhala"], shift: "Flexible", timezone: "GMT", employmentType: "part-time", salaryLabel: "Negotiable", postedAtLabel: "Demo" },
  { id: "demo-3", title: "Live Chat Representative", companyName: "Sample Global Support", location: "Sri Lanka", remote: true, processType: "non-voice", requiredLanguages: ["English"], shift: "Day shift", timezone: "AEST", employmentType: "contract", salaryLabel: "Negotiable", postedAtLabel: "Demo" },
  { id: "demo-4", title: "Remote Technical Support", companyName: "Sample IT Helpdesk", location: "Remote", remote: true, processType: "technical-support", requiredLanguages: ["English", "Tamil"], shift: "Rotational", timezone: "GMT", employmentType: "full-time", salaryLabel: "Negotiable", postedAtLabel: "Demo" },
];
const processes: { value: BpoProcessType; label: string }[] = [
  { value: "voice", label: "Voice" }, { value: "non-voice", label: "Non-voice" },
  { value: "technical-support", label: "Technical support" }, { value: "data-entry", label: "Data entry" },
  { value: "content-moderation", label: "Content moderation" }, { value: "healthcare-bpo", label: "Healthcare BPO" },
  { value: "finance-bpo", label: "Finance BPO" }, { value: "other", label: "Other" },
];
const languages = [...new Set(sampleJobs.flatMap((job) => job.requiredLanguages))].sort();
const shifts = ["Day", "Night", "Rotational", "Flexible", "Weekend"];
const selectClass = "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-100";

export default function JobSearchFilters() {
  const [keyword, setKeyword] = useState("");
  const [process, setProcess] = useState("");
  const [language, setLanguage] = useState("");
  const [shift, setShift] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const results = useMemo(() => sampleJobs.filter((job) => {
    const search = [job.title, job.companyName, job.location, job.description ?? ""].join(" ").toLowerCase();
    return search.includes(keyword.trim().toLowerCase())
      && (!process || job.processType === process)
      && (!language || job.requiredLanguages.some((item) => item.toLowerCase() === language.toLowerCase()))
      && (!shift || job.shift.toLowerCase().includes(shift.toLowerCase()));
  }), [keyword, process, language, shift]);
  const filtered = Boolean(keyword || process || language || shift);
  function resetFilters() { setKeyword(""); setProcess(""); setLanguage(""); setShift(""); }
  return <section aria-label="Search remote BPO jobs" className="space-y-5 text-slate-900">
    <header className="rounded-xl bg-slate-900 p-6 text-white sm:p-8">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Find remote BPO jobs</h2>
      <p className="mt-2 text-sm text-slate-300">Search customer support, data entry and other remote opportunities.</p>
      <label htmlFor="job-keyword" className="mt-5 block text-sm font-medium">Search by keyword</label>
      <input id="job-keyword" type="search" value={keyword} onChange={(event) => setKeyword(event.target.value)}
        placeholder="Job title, company or location" className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400" />
    </header>
    <div className="grid items-start gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3"><h3 className="text-base font-semibold">Filters</h3>
          <button type="button" aria-controls="job-filter-controls" aria-expanded={showFilters} onClick={() => setShowFilters((current) => !current)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm lg:hidden">{showFilters ? "Hide" : "Show"}</button>
        </div>
        <div id="job-filter-controls" className={`${showFilters ? "block" : "hidden"} mt-4 space-y-4 lg:block`}>
          <label className="block text-sm font-medium text-slate-700">Process type
            <select className={selectClass} value={process} onChange={(event) => setProcess(event.target.value)}><option value="">All processes</option>{processes.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select>
          </label>
          <label className="block text-sm font-medium text-slate-700">Required language
            <select className={selectClass} value={language} onChange={(event) => setLanguage(event.target.value)}><option value="">All languages</option>{languages.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          </label>
          <label className="block text-sm font-medium text-slate-700">Working shift
            <select className={selectClass} value={shift} onChange={(event) => setShift(event.target.value)}><option value="">All shifts</option>{shifts.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          </label>
          <button type="button" disabled={!filtered} onClick={resetFilters} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Clear filters</button>
        </div>
      </aside>
      <div className="min-w-0" aria-live="polite">
        {results.length ? <JobList jobs={results} title="Matching jobs" /> : <section className="rounded-xl border border-slate-200 bg-white p-8 text-center" role="status"><h3 className="text-lg font-semibold">No matching jobs</h3><p className="mt-2 text-sm text-slate-500">Try another keyword or change your filters.</p><button type="button" onClick={resetFilters} className="mt-4 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">Clear filters</button></section>}
      </div>
    </div>
    <p className="text-xs text-slate-500">Sample jobs for UI testing. Live job data will be connected by the team later.</p>
  </section>;
}
