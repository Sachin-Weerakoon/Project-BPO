"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { calculateTypingScore, type TypingScore } from "../../lib/typingScore";

const DURATION = 60;
const STORAGE_KEY = "remotebpo-megha-typing-v1";
const TEXT = "Remote customer support requires clear communication, accurate information and careful attention to detail. A great service agent listens to the customer, responds with empathy and records every important request correctly.";
type Attempt = TypingScore & { completedAt: string };

export default function TypingTest() {
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<"ready" | "running" | "complete">("ready");
  const [remaining, setRemaining] = useState(DURATION);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [result, setResult] = useState<Attempt | null>(null);
  const startRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(stored)) setAttempts(stored.filter((item) => item && typeof item.wpm === "number").slice(0, 5) as Attempt[]);
    } catch { /* Storage blocked or invalid: test remains usable */ }
  }, []);

  const finish = useCallback((text: string, seconds: number) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const attempt: Attempt = { ...calculateTypingScore(TEXT, text, seconds), completedAt: new Date().toISOString() };
    setResult(attempt);
    setPhase("complete");
    setAttempts((previous) => {
      const next = [attempt, ...previous].slice(0, 5);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* local fallback */ }
      return next;
    });
  }, []);

  useEffect(() => {
    if (phase !== "running") return;
    const timer = window.setInterval(() => {
      if (startRef.current === null) return;
      const seconds = Math.floor((Date.now() - startRef.current) / 1000);
      setRemaining(Math.max(0, DURATION - seconds));
    }, 250);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === "running" && remaining === 0) finish(typed, DURATION);
  }, [finish, phase, remaining, typed]);

  function handleTyping(value: string) {
    if (phase === "complete") return;
    if (phase === "ready") { startRef.current = Date.now(); setPhase("running"); }
    setTyped(value);
    if (value === TEXT) finish(value, Math.max(1, Math.ceil((Date.now() - (startRef.current ?? Date.now())) / 1000)));
  }
  function reset() {
    setTyped(""); setPhase("ready"); setRemaining(DURATION); setResult(null);
    startRef.current = null; finishedRef.current = false;
    requestAnimationFrame(() => inputRef.current?.focus());
  }
  const live = calculateTypingScore(TEXT, typed, DURATION - remaining || 1);
  return (
    <section className="space-y-5" aria-labelledby="typing-heading">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Candidate assessment</p><h2 id="typing-heading" className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Typing speed & accuracy</h2><p className="mt-2 text-sm text-slate-600">A focused 60-second practice for live chat and data-entry roles.</p></div>
        <span className="rounded-xl bg-slate-900 px-5 py-3 text-lg font-semibold tabular-nums text-white" aria-label={`${remaining} seconds remaining`}>{remaining}s</span>
      </header>
      <div className="grid gap-4 sm:grid-cols-3" aria-live="off">
        {[{label:"Speed",value:`${result?.wpm ?? live.wpm} WPM`},{label:"Accuracy",value:`${result?.accuracy ?? live.accuracy}%`},{label:"Mistakes",value:String(result?.errors ?? live.errors)}].map((item) => <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">{item.label}</p><p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{item.value}</p></div>)}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <p className="mb-3 text-sm font-semibold text-slate-700">Copy this passage accurately</p>
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-[17px] leading-8 text-slate-700 select-none" aria-label="Text to type">{TEXT}</p>
        <label htmlFor="typing-answer" className="mb-2 mt-5 block text-sm font-semibold text-slate-700">Your typing</label>
        <textarea ref={inputRef} id="typing-answer" rows={4} spellCheck={false} autoCapitalize="off" autoCorrect="off" disabled={phase === "complete"} value={typed} onChange={(event) => handleTyping(event.target.value)} placeholder="Start typing here to begin the timer..." className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-base leading-7 text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50" />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">{phase === "ready" ? "Timer begins on your first keystroke." : phase === "running" ? "Type the passage, or finish early to see your result." : "Test completed. You can start another attempt."}</p>
          <div className="flex gap-2"><button type="button" onClick={reset} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">{phase === "ready" ? "Clear" : "Try again"}</button>{phase === "running" && <button type="button" onClick={() => finish(typed, Math.max(1, DURATION - remaining))} className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">Finish test</button>}</div>
        </div>
        {result && <div role="status" className="mt-5 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">Completed: <strong>{result.wpm} WPM</strong> at <strong>{result.accuracy}% accuracy</strong>. Result saved locally in this browser only.</div>}
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-label="Practice history"><div className="flex flex-wrap justify-between gap-2"><h3 className="text-lg font-semibold text-slate-900">Recent attempts</h3><span className="text-xs text-slate-500">Latest 5 · this browser only</span></div>{attempts.length ? <ul className="mt-4 divide-y divide-slate-100">{attempts.map((a,i)=><li key={`${a.completedAt}-${i}`} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span className="text-slate-500">{new Date(a.completedAt).toLocaleString()}</span><span className="font-semibold text-slate-800">{a.wpm} WPM · {a.accuracy}%</span></li>)}</ul> : <p className="mt-3 text-sm text-slate-500">No practice attempts yet.</p>}</section>
      <p className="text-xs leading-5 text-slate-500">Practice mode: positional character accuracy; WPM = correct characters ÷ 5 ÷ minutes. No server-side assessment or account storage is connected.</p>
    </section>
  );
}
