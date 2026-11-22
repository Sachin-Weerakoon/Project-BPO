"use client";

import { useMemo, useState, type FormEvent } from "react";
import { demoJobs } from "../../data/demoJobs";
import { normalizeRating } from "../../lib/typingScore";

const companies = [
  { name: "Sample Support Services", initials: "SS", focus: "Customer care operations", location: "Sri Lanka · Global remote", about: "A fictional BPO provider offering multilingual customer assistance for international teams." },
  { name: "Sample Data Operations", initials: "SD", focus: "Back-office and data services", location: "Remote-first", about: "A fictional team supporting accurate data handling and administrative operations." },
  { name: "Sample Global Support", initials: "SG", focus: "Live chat and customer experience", location: "Sri Lanka · Global remote", about: "A fictional support organization providing chat and ticket-based customer service." },
  { name: "Sample IT Helpdesk", initials: "SI", focus: "Technical support", location: "Remote-first", about: "A fictional helpdesk helping distributed clients troubleshoot common technology issues." },
];
type Review = { id: number; company: string; rating: number; content: string };
const label = "block text-sm font-medium text-slate-700";
const field = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

export default function CompanyProfile() {
  const [companyName, setCompanyName] = useState(companies[0].name);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const company = companies.find((item) => item.name === companyName) ?? companies[0];
  const openings = demoJobs.filter((job) => job.companyName === company.name);
  const listed = useMemo(() => reviews.filter((review) => review.company === companyName), [companyName, reviews]);
  function addReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleaned = content.trim();
    if (cleaned.length < 10 || cleaned.length > 500) { setMessage("Write a review between 10 and 500 characters."); return; }
    setReviews((previous) => [{ id: Date.now(), company: companyName, rating: normalizeRating(rating), content: cleaned }, ...previous]);
    setContent(""); setMessage("Practice review added in this session only.");
  }
  return (
    <section className="space-y-5" aria-labelledby="company-heading">
      <header><p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Explore employers</p><h2 id="company-heading" className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Company profiles & reviews</h2><p className="mt-2 text-sm text-slate-600">Learn about a team before applying. All organizations below are fictional examples.</p></header>
      <div className="rounded-xl border border-slate-200 bg-white p-4"><label className={label} htmlFor="company-choice">Choose sample company</label><select id="company-choice" className={`${field} max-w-md`} value={companyName} onChange={(e)=>{setCompanyName(e.target.value);setMessage("");}}>{companies.map((c)=><option key={c.name}>{c.name}</option>)}</select></div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        
        <div className="p-5 sm:p-7"><div className="flex flex-wrap items-center gap-4"><div className="grid size-16 place-items-center rounded-xl bg-teal-50 text-xl font-bold text-teal-700">{company.initials}</div><div className="pb-1"><p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Company profile · Demo</p><h3 className="text-2xl font-bold text-slate-900 sm:text-3xl">{company.name}</h3></div></div>
          <dl className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2"><div><dt className="text-xs font-semibold uppercase tracking-widest text-slate-500">Specialization</dt><dd className="mt-1 text-sm text-slate-800">{company.focus}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-widest text-slate-500">Work model</dt><dd className="mt-1 text-sm text-slate-800">{company.location}</dd></div></dl>
          <h4 className="mt-7 text-base font-semibold text-slate-900">About this company</h4><p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">{company.about}</p><p className="mt-2 text-xs text-slate-500">Verification status: Not verified (fictional company). No real website or third-party identity is claimed.</p>
        </div>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"><h3 className="text-lg font-semibold text-slate-900">Open positions <span className="ml-2 text-sm font-normal text-slate-500">{openings.length}</span></h3><ul className="mt-4 divide-y divide-slate-100">{openings.map((job)=><li key={job.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-semibold text-slate-800">{job.title}</p><p className="mt-1 text-sm text-slate-500">{job.shift} · {job.timezone} · {job.requiredLanguages.join(", ")}</p></div><span className="rounded-lg bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800">Remote</span></li>)}</ul><p className="mt-3 text-xs text-slate-500">Find Jobs tab provides the demo apply flow.</p></section>
      <section className="grid items-start gap-5 lg:grid-cols-[1fr_1fr]" aria-label="Candidate reviews">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h3 className="text-lg font-semibold text-slate-900">Reviews</h3><p className="mt-1 text-xs text-slate-500">Demo contributions from this browser session, not verified public reviews.</p>{listed.length ? <ul className="mt-4 space-y-3">{listed.map((review)=><li key={review.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4"><span aria-label={`${review.rating} out of 5 stars`} className="font-semibold text-teal-700">{review.rating} / 5</span><p className="mt-2 break-words text-sm leading-6 text-slate-700">{review.content}</p></li>)}</ul> : <p className="mt-5 rounded-lg border border-dashed border-slate-200 p-5 text-sm text-slate-500">No demo reviews for this company yet.</p>}</div>
        <form onSubmit={addReview} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h3 className="text-lg font-semibold text-slate-900">Try the review form</h3><p className="mt-1 text-sm text-slate-500">A basic UI preview. Submission does not publish anywhere.</p><label htmlFor="review-rating" className={`${label} mt-5`}>Rating</label><select id="review-rating" className={field} value={rating} onChange={(event)=>setRating(Number(event.target.value))}>{[5,4,3,2,1].map(n=><option value={n} key={n}>{n} / 5</option>)}</select><label htmlFor="review-text" className={`${label} mt-4`}>Your review</label><textarea id="review-text" className={field} rows={4} maxLength={500} value={content} onChange={(event)=>setContent(event.target.value)} placeholder="Describe the experience (demo only)..."/><div className="mt-3 flex justify-between gap-3"><span className="text-xs text-slate-500">{content.length}/500</span><button type="submit" className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">Add demo review</button></div>{message && <p role="status" className="mt-3 text-sm text-teal-800">{message}</p>}</form>
      </section>
    </section>
  );
}
