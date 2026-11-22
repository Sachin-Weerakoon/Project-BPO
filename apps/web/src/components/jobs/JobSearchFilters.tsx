"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { BpoProcessType } from "../../types/candidate";
import JobList from "./JobList";
import { demoJobs } from "../../data/demoJobs";
import { filterJobs, paginateJobs } from "../../lib/jobSearch";
import styles from "./JobExperience.module.css";

/** Local sample records until the team provides the final Job API contract. */


const processOptions: { value: BpoProcessType; label: string }[] = [
  { value: "voice", label: "Voice" }, { value: "non-voice", label: "Non-voice" },
  { value: "technical-support", label: "Technical support" }, { value: "data-entry", label: "Data entry" },
  { value: "content-moderation", label: "Content moderation" }, { value: "healthcare-bpo", label: "Healthcare BPO" },
  { value: "finance-bpo", label: "Finance BPO" }, { value: "other", label: "Other" },
];
const languages = [...new Set(demoJobs.flatMap((job) => job.requiredLanguages))].sort();
const shifts = ["Day", "Night", "Rotational", "Flexible", "Weekend"];
const PAGE_SIZE = 2; // Intentional: demonstrate pagination with the four sample jobs.

const selectClass = "mt-1.5 block h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 transition-colors focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-100";
const primaryButton = "inline-flex min-h-10 items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm motion-safe:transition-[background-color,transform] motion-safe:duration-150 motion-safe:active:scale-[.98] hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 motion-safe:transition-[background-color,transform] motion-safe:duration-150 motion-safe:active:scale-[.98] hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-40";

type View = "all" | "saved";
type DialogType = "alert" | "apply" | null;
type SearchCriteria = { keyword: string; process: string; language: string; shift: string };

/** Accessible native dialog: Escape and backdrop close, focus is managed by the browser. */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      aria-label={title}
      className={`fixed inset-0 m-auto max-h-[calc(100vh-2rem)] w-[min(92vw,31rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/55 ${styles.dialogEnter}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <button type="button" onClick={onClose} aria-label="Close dialog" className="grid size-9 place-items-center rounded-lg text-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-teal-600">×</button>
      </div>
      <div className="space-y-5 px-6 py-5">{children}</div>
    </dialog>
  );
}

function AlertCriteria({ value }: { value: SearchCriteria }) {
  const processLabel = processOptions.find((item) => item.value === value.process)?.label ?? "All processes";
  return (
    <dl className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-sm">
      <div><dt className="text-xs text-slate-500">Keyword</dt><dd className="mt-1 break-words font-medium text-slate-900">{value.keyword.trim() || "Any"}</dd></div>
      <div><dt className="text-xs text-slate-500">Process</dt><dd className="mt-1 font-medium text-slate-900">{processLabel}</dd></div>
      <div><dt className="text-xs text-slate-500">Language</dt><dd className="mt-1 font-medium text-slate-900">{value.language || "Any language"}</dd></div>
      <div><dt className="text-xs text-slate-500">Shift</dt><dd className="mt-1 font-medium text-slate-900">{value.shift || "Any shift"}</dd></div>
    </dl>
  );
}

export default function JobSearchFilters() {
  const [keyword, setKeyword] = useState("");
  const [process, setProcess] = useState("");
  const [language, setLanguage] = useState("");
  const [shift, setShift] = useState("");
  const [view, setView] = useState<View>("all");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [appliedIds, setAppliedIds] = useState<string[]>([]);
  const [savedAlert, setSavedAlert] = useState<SearchCriteria | null>(null);
  const [dialog, setDialog] = useState<DialogType>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const criteria: SearchCriteria = { keyword, process, language, shift };
  const hasFilters = Boolean(keyword.trim() || process || language || shift);
  const matchingJobs = useMemo(() => filterJobs(
    demoJobs, { keyword, process, language, shift }, savedIds, view === "saved"
  ), [keyword, process, language, shift, view, savedIds]);

  const { page: currentPage, pages: pageCount, items: visibleJobs } = paginateJobs(matchingJobs, page, PAGE_SIZE);
  const selectedJob = demoJobs.find((job) => job.id === selectedJobId);

  function clearFilters() { setKeyword(""); setProcess(""); setLanguage(""); setShift(""); setPage(1); }
  function switchView(next: View) { setView(next); setPage(1); setStatus(""); }
  function toggleSaved(id: string) {
    setSavedIds((existing) => existing.includes(id) ? existing.filter((item) => item !== id) : [...existing, id]);
    setPage(1);
  }
  function openApply(id: string) { setSelectedJobId(id); setDialog("apply"); }
  function closeDialog() { setDialog(null); setSelectedJobId(null); }
  function confirmApply() {
    if (!selectedJob || appliedIds.includes(selectedJob.id)) return;
    setAppliedIds((existing) => [...existing, selectedJob.id]);
    setStatus(`Demo application confirmed for ${selectedJob.title}. Nothing was submitted to an employer.`);
    closeDialog();
  }

  return (
    <section aria-label="Job discovery" className="space-y-5 text-slate-900">
      {/* One concise header: search belongs here, detailed filters belong in the sidebar. */}
      <header className="relative overflow-hidden rounded-2xl bg-slate-900 px-5 py-8 text-white sm:px-8 sm:py-9">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full border border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-5 -top-16 size-48 rounded-full border border-teal-400/20" />
        <div className="relative max-w-3xl">
          <span className="text-xs font-semibold uppercase tracking-[.18em] text-teal-300">REMOTE OPPORTUNITIES</span>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[30px]">Find your next BPO role</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Search customer support, live chat, data entry and technical support opportunities.</p>
          <label htmlFor="job-keyword" className="mt-6 block text-sm font-medium text-slate-100">Search jobs</label>
          <div className="relative mt-2">
            <svg aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg>
            <input id="job-keyword" type="search" value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1); }} placeholder="Job title, company or location" className="h-12 w-full rounded-xl border border-white/20 bg-white pl-12 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-300" />
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div role="group" aria-label="Job views" className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={view === "all"} onClick={() => switchView("all")} className={view === "all" ? primaryButton : secondaryButton}>All jobs</button>
          <button type="button" aria-pressed={view === "saved"} onClick={() => switchView("saved")} className={view === "saved" ? primaryButton : secondaryButton}>Saved jobs <span className="ml-2 rounded-md bg-black/10 px-1.5 py-0.5 text-xs">{savedIds.length}</span></button>
        </div>
        <button type="button" onClick={() => setDialog("alert")} className={secondaryButton}>
          <svg aria-hidden="true" className="mr-2 size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>
          {savedAlert ? "Alert saved" : "Create job alert"}
        </button>
      </div>

      {status && <p key={status} role="status" className={`rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-900 ${styles.statusEnter}`}>{status}</p>}

      <div className="grid items-start gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside aria-label="Job filters" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div><h3 className="text-base font-semibold">Refine results</h3><p className="mt-1 text-xs text-slate-500">Find a suitable shift and role.</p></div>
            <button type="button" aria-controls="job-filter-fields" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((value) => !value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 lg:hidden">{filtersOpen ? "Hide" : "Show"}</button>
          </div>
          <div id="job-filter-fields" className={`${filtersOpen ? "block" : "hidden"} mt-5 space-y-4 lg:block`}>
            <div><label htmlFor="job-process" className="text-sm font-medium text-slate-700">Process type</label><select id="job-process" value={process} onChange={(event) => { setProcess(event.target.value); setPage(1); }} className={selectClass}><option value="">All processes</option>{processOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
            <div><label htmlFor="job-language" className="text-sm font-medium text-slate-700">Required language</label><select id="job-language" value={language} onChange={(event) => { setLanguage(event.target.value); setPage(1); }} className={selectClass}><option value="">All languages</option>{languages.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
            <div><label htmlFor="job-shift" className="text-sm font-medium text-slate-700">Working shift</label><select id="job-shift" value={shift} onChange={(event) => { setShift(event.target.value); setPage(1); }} className={selectClass}><option value="">All shifts</option>{shifts.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
            <button type="button" disabled={!hasFilters} onClick={clearFilters} className={`${secondaryButton} w-full`}>Clear filters</button>
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          {matchingJobs.length > 0 ? (
            <>
              <JobList jobs={visibleJobs} title={view === "saved" ? "Saved opportunities" : "Matching opportunities"} totalCount={matchingJobs.length} renderActions={(job) => (
                <>
                  <button type="button" aria-pressed={savedIds.includes(job.id)} aria-label={`${savedIds.includes(job.id) ? "Remove" : "Save"} ${job.title} ${savedIds.includes(job.id) ? "from" : "to"} saved jobs`} onClick={() => toggleSaved(job.id)} className={secondaryButton}>{savedIds.includes(job.id) ? "Saved ✓" : "Save"}</button>
                  <button type="button" disabled={appliedIds.includes(job.id)} onClick={() => openApply(job.id)} className={primaryButton}>{appliedIds.includes(job.id) ? "Applied (demo)" : "Apply"}</button>
                </>
              )} />
              <nav aria-label="Job result pagination" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-sm text-slate-600">Showing <strong className="font-medium text-slate-900">{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, matchingJobs.length)}</strong> of {matchingJobs.length}</p>
                <div className="flex items-center gap-2"><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className={secondaryButton}>Previous</button><span className="px-1 text-sm font-medium text-slate-700" aria-current="page">{currentPage} / {pageCount}</span><button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} className={secondaryButton}>Next</button></div>
              </nav>
            </>
          ) : (
            <div role="status" className={`rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm ${styles.contentEnter}`}>
              <div aria-hidden="true" className="mx-auto grid size-12 place-items-center rounded-full bg-slate-100 text-xl text-slate-500">⌕</div>
              <h3 className="mt-3 text-lg font-semibold">{view === "saved" && savedIds.length === 0 ? "No saved jobs yet" : "No matching jobs"}</h3>
              <p className="mt-2 text-sm text-slate-600">{view === "saved" && savedIds.length === 0 ? "Select Save on a job to keep it for later." : "Try adjusting your search or filters."}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">{hasFilters && <button type="button" onClick={clearFilters} className={secondaryButton}>Clear filters</button>}{view === "saved" && <button type="button" onClick={() => switchView("all")} className={primaryButton}>Explore jobs</button>}</div>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs leading-5 text-slate-500">Demo UI: four fictional listings. Saved jobs, alerts, and applications are stored only in this page session; no backend requests or emails are sent.</p>

      {dialog === "alert" && (
        <Modal title={savedAlert ? "Your job alert" : "Create a job alert"} onClose={closeDialog}>
          <p className="text-sm leading-6 text-slate-600">Save your current search preferences as an alert. To change these preferences, adjust the search filters first.</p>
          <AlertCriteria value={criteria} />
          {savedAlert && <div><p className="mb-2 text-sm font-medium text-slate-700">Currently saved alert</p><AlertCriteria value={savedAlert} /></div>}
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">Preview only — no email or notification will be sent.</p>
          <div className="flex flex-wrap justify-end gap-2">
            {savedAlert && <button type="button" onClick={() => { setSavedAlert(null); closeDialog(); setStatus("Demo job alert removed."); }} className={secondaryButton}>Remove alert</button>}
            <button type="button" onClick={closeDialog} className={secondaryButton}>Cancel</button>
            <button type="button" onClick={() => { setSavedAlert({ ...criteria }); closeDialog(); setStatus("Demo job alert preferences saved for this session."); }} className={primaryButton}>{savedAlert ? "Update alert" : "Save alert"}</button>
          </div>
        </Modal>
      )}

      {dialog === "apply" && selectedJob && (
        <Modal title="Review application" onClose={closeDialog}>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">{selectedJob.companyName}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{selectedJob.title}</p>
            <p className="mt-1 text-sm text-slate-600">{selectedJob.location} · {selectedJob.shift} · {selectedJob.timezone}</p>
          </div>
          <p className="text-sm leading-6 text-slate-600">Confirming will mark this job as applied in your current demo session. Your candidate profile and resume will <strong>not</strong> be submitted.</p>
          <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={closeDialog} className={secondaryButton}>Cancel</button><button type="button" onClick={confirmApply} className={primaryButton}>Confirm demo application</button></div>
        </Modal>
      )}
    </section>
  );
}
