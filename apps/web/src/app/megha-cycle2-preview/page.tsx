"use client";
import { useState } from "react";
import CandidateProfileForm from "../../components/candidate/CandidateProfileForm";
import JobSearchFilters from "../../components/jobs/JobSearchFilters";

export default function Cycle2Preview() {
  const [active, setActive] = useState<"jobs" | "profile">("jobs");
  return <main className="min-h-screen bg-[#eef2f7] px-3 py-6 font-sans text-slate-900 sm:px-6 lg:px-8" style={{ fontFamily: 'Inter, "Segoe UI", Arial, sans-serif' }}>
    <div className="mx-auto max-w-[1440px]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-widest text-slate-500">RemoteBPO Hub</p><h1 className="text-lg font-extrabold text-slate-900">Candidate Experience · Cycle 2</h1></div>
        <div role="tablist" aria-label="Cycle 2 screens" className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button type="button" role="tab" aria-selected={active === "jobs"} onClick={() => setActive("jobs")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${active === "jobs" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>Find Jobs</button>
          <button type="button" role="tab" aria-selected={active === "profile"} onClick={() => setActive("profile")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${active === "profile" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>Candidate Profile</button>
        </div>
      </div>
      <div role="tabpanel" aria-label={active === "jobs" ? "Job search" : "Candidate profile"}>
        <div className={active === "jobs" ? "block" : "hidden"}><JobSearchFilters /></div>
        <div className={active === "profile" ? "block" : "hidden"}><CandidateProfileForm /></div>
      </div>
    </div>
  </main>;
}
