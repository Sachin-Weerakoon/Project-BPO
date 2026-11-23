"use client";

import { useState } from "react";

type Notice = { id: string; category: "Application" | "Job alert" | "Message" | "Assessment"; title: string; detail: string; read: boolean };
const initialNotices: Notice[] = [
  { id: "n1", category: "Application", title: "Application status updates", detail: "When the backend is connected, application progress will appear here.", read: false },
  { id: "n2", category: "Job alert", title: "New matching job alerts", detail: "Saved search notifications will appear here when delivery is enabled.", read: false },
  { id: "n3", category: "Assessment", title: "Typing assessment reminders", detail: "Practice scores are currently stored only in your browser.", read: true },
];

export default function NotificationCenter() {
  const [notices, setNotices] = useState(initialNotices);
  const [view, setView] = useState<"all" | "unread">("all");
  const [preferences, setPreferences] = useState({ applications: true, alerts: true, assessments: true });
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const unread = notices.filter((notice) => !notice.read).length;
  const filtered = view === "unread" ? notices.filter((notice) => !notice.read) : notices;
  return <section className="space-y-5" aria-labelledby="notifications-heading">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Candidate updates</p><h2 id="notifications-heading" className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Notification center</h2><p className="mt-2 text-sm text-slate-600">Review your updates and manage notification preferences.</p></div><span className="rounded-lg bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800">{unread} unread</span></header>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Preview data only. No live employer events, push notifications or emails are connected.</div>
    <div className="space-y-4">
      <button type="button" aria-expanded={preferencesOpen} aria-controls="notification-preferences" onClick={()=>setPreferencesOpen(v=>!v)} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700">{preferencesOpen ? "Hide notification preferences" : "Manage notification preferences"}</button>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4"><div role="group" aria-label="Filter notifications" className="flex gap-2"><button type="button" aria-pressed={view === "all"} onClick={()=>setView("all")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${view === "all" ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-700"}`}>All</button><button type="button" aria-pressed={view === "unread"} onClick={()=>setView("unread")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${view === "unread" ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-700"}`}>Unread</button></div><button type="button" disabled={!unread} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:opacity-40" onClick={()=>setNotices((current)=>current.map((item)=>({...item, read:true})))}>Mark all read</button></header>
        {filtered.length ? <ul className="divide-y divide-slate-100">{filtered.map((notice)=><li key={notice.id} className={`flex flex-wrap items-start justify-between gap-4 p-5 ${notice.read ? "" : "bg-teal-50/30"}`}><div className="max-w-xl"><p className="text-xs font-semibold uppercase tracking-wide text-teal-700">{notice.category}</p><h3 className="mt-1 font-semibold text-slate-900">{notice.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{notice.detail}</p></div>{!notice.read && <button type="button" onClick={()=>setNotices((previous)=>previous.map((item)=>item.id===notice.id ? {...item,read:true}:item))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">Mark read</button>}</li>)}</ul> : <p role="status" className="p-10 text-center text-sm text-slate-500">You are all caught up.</p>}
      </section>
      <aside id="notification-preferences" hidden={!preferencesOpen} className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-5"><h3 className="text-lg font-semibold text-slate-900">Preferences</h3><p className="mt-1 text-sm text-slate-500">UI preferences in this session only.</p><div className="mt-5 space-y-4">{([{key:"applications",label:"Application updates"},{key:"alerts",label:"Job alerts"},{key:"assessments",label:"Assessment notices"}] as const).map(({key,label})=><label key={key} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-3 text-sm font-medium text-slate-700"><span>{label}</span><input type="checkbox" checked={preferences[key]} onChange={()=>setPreferences((existing)=>({...existing,[key]:!existing[key]}))} className="size-5 accent-teal-700"/></label>)}</div><p className="mt-4 text-xs leading-5 text-slate-500">Preferences are not synced to an account; no actual delivery is enabled.</p></aside>
    </div>
  </section>;
}
