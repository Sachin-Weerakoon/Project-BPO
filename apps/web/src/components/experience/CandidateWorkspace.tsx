"use client";

import { useState } from "react";
import CandidateProfileForm from "../candidate/CandidateProfileForm";
import JobSearchFilters from "../jobs/JobSearchFilters";
import TypingTest from "./TypingTest";
import CompanyProfile from "./CompanyProfile";
import NotificationCenter from "./NotificationCenter";

type SectionId = "jobs" | "profile" | "typing" | "companies" | "notifications";
const sections: { id: SectionId; label: string; subtitle: string }[] = [
  { id: "jobs", label: "Explore jobs", subtitle: "Discover remote work that fits your schedule" },
  { id: "profile", label: "My profile", subtitle: "Your skills, language and workspace readiness" },
  { id: "typing", label: "Typing assessment", subtitle: "Measure speed and accuracy" },
  { id: "companies", label: "Companies", subtitle: "Discover employers and reviews" },
  { id: "notifications", label: "Notifications", subtitle: "Review your updates and preferences" },
];

/** Candidate-only preview. Does not alter team-owned navigation, authentication or APIs. */
export default function CandidateWorkspace() {
  const [active, setActive] = useState<SectionId>("jobs");
  const current = sections.find((section) => section.id === active) ?? sections[0];

  return (
    <main className="min-h-screen bg-[#f5f8f9] text-[#18283a]" style={{ fontFamily: 'var(--font-geist-sans), "Segoe UI", Arial, sans-serif' }}>
      <header className="border-b border-[#dae4e6] bg-white">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-[#142235] text-base font-bold text-white" aria-hidden="true">RB</span>
            <div>
              <p className="text-lg font-bold tracking-tight text-[#142235]">RemoteBPO <span className="text-[#087f7a]">Hub</span></p>
              <p className="text-[13px] text-slate-500">Candidate experience</p>
            </div>
          </div>
          <p className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-[13px] font-medium text-teal-900">UI preview · Demo data</p>
        </div>
        <nav aria-label="Candidate navigation" className="mx-auto max-w-[1400px] overflow-x-auto px-5 sm:px-8">
          <div className="flex min-w-max items-end gap-1" role="tablist" aria-label="Candidate experience sections">
            {sections.map((section) => (
              <button key={section.id} type="button" role="tab" aria-selected={active === section.id}
                aria-controls={`candidate-panel-${section.id}`}
                onClick={() => setActive(section.id)}
                className={`min-h-12 border-b-[3px] px-4 py-3 text-[15px] font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-teal-700 ${active === section.id ? "border-[#087f7a] text-[#087f7a]" : "border-transparent text-slate-600 hover:border-slate-300 hover:text-[#142235]"}`}>
                {section.label}
              </button>
            ))}
          </div>
        </nav>
      </header>
      <div className="mx-auto max-w-[1400px] px-5 pb-14 pt-7 sm:px-8 sm:pt-9">
        <div className="mb-8 border-b border-slate-200 pb-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-[#087f7a]">Your candidate workspace</p>
          <h1 className="text-3xl font-bold tracking-tight text-[#142235] sm:text-[34px]">{current.label}</h1>
          <p className="mt-2 text-base text-slate-600">{current.subtitle}</p>
        </div>
        {/* Panels remain mounted to preserve unsaved form and local demo interactions on tab switches. */}
        <section id="candidate-panel-jobs" role="tabpanel" aria-label="Explore jobs" hidden={active !== "jobs"}><JobSearchFilters /></section>
        <section id="candidate-panel-profile" role="tabpanel" aria-label="My profile" hidden={active !== "profile"}><CandidateProfileForm /></section>
        <section id="candidate-panel-typing" role="tabpanel" aria-label="Typing assessment" hidden={active !== "typing"}><TypingTest /></section>
        <section id="candidate-panel-companies" role="tabpanel" aria-label="Companies" hidden={active !== "companies"}><CompanyProfile /></section>
        <section id="candidate-panel-notifications" role="tabpanel" aria-label="Notifications" hidden={active !== "notifications"}><NotificationCenter /></section>
        <p className="mt-12 border-t border-slate-200 pt-5 text-[13px] text-slate-500">Frontend candidate preview. Jobs and companies are fictional; saved jobs, applications and notifications are not connected to a live backend.</p>
      </div>
    </main>
  );
}
