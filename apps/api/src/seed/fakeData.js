'use strict';

// Fake BPO seed data (no real people). Same seed -> same data, so tests and demos are repeatable.
// Plain objects with MongoDB-style ids (24 hex chars). run.js writes them to MongoDB. Guide: docs/seed-data.md
const PROCESS_TYPES = ['voice', 'non_voice', 'tech_support', 'data_entry', 'content_moderation', 'healthcare', 'finance', 'other'];
const LANGUAGES = ['English', 'Sinhala', 'Tamil', 'Hindi', 'Arabic', 'French', 'Spanish', 'German'];
const PROFICIENCY = ['basic', 'conversational', 'fluent', 'native'];
const SHIFTS = ['us_day', 'us_night', 'uk', 'apac', 'emea', 'rotational'];
const TIMEZONES = ['Asia/Colombo', 'Asia/Kolkata', 'Asia/Manila', 'Asia/Dubai', 'Europe/London', 'America/New_York'];
const TOOLS = ['Zendesk', 'Salesforce', 'Freshdesk', 'HubSpot', 'Intercom', 'ServiceNow', 'Jira', 'Excel', 'Google Sheets'];
const JOB_STATUSES = ['published', 'published', 'published', 'draft', 'paused', 'closed'];
const APP_STATUSES = ['applied', 'under_review', 'assessment', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'];
const FIRST = ['Amaya', 'Kasun', 'Nimali', 'Ravi', 'Tharushi', 'Dilan', 'Priya', 'Arjun', 'Sara', 'Omar', 'Lina', 'Mark'];
const LAST = ['Perera', 'Silva', 'Fernando', 'Kumar', 'Rajan', 'Khan', 'Smith', 'Garcia', 'Nair', 'Ali'];
const COMPANY_WORDS = ['Blue', 'Harbor', 'Summit', 'Lotus', 'Nova', 'Bright', 'Pacific', 'Cedar'];
const COMPANY_TYPES = ['Support', 'Outsourcing', 'Services', 'Solutions', 'Connect'];
const JOB_TITLES = {
  voice: 'Customer Support Agent (Voice)', non_voice: 'Chat & Email Support Agent', tech_support: 'Technical Support Specialist',
  data_entry: 'Data Entry Operator', content_moderation: 'Content Moderator', healthcare: 'Medical Billing Associate',
  finance: 'Accounts Receivable Associate', other: 'Back Office Associate',
};

// Seeded random numbers (mulberry32)
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeSeedData({ seed = 42, candidates = 30, employers = 5, jobsPerCompany = 4, now = new Date('2026-11-01T00:00:00Z') } = {}) {
  const r = rng(seed);
  const int = (min, max) => min + Math.floor(r() * (max - min + 1));
  const pick = (list) => list[Math.floor(r() * list.length)];
  const some = (list, min, max) => [...list].sort(() => r() - 0.5).slice(0, int(min, max));
  // Deterministic ObjectId-style ids (24 hex chars), so re-running updates the same documents
  const objectId = () => Array.from({ length: 24 }, () => Math.floor(r() * 16).toString(16)).join('');
  const daysAgo = (d) => new Date(now.getTime() - d * 86400000).toISOString();

  const users = [];
  const candidateProfiles = [];
  const companies = [];
  const jobs = [];
  const applications = [];

  users.push({ _id: objectId(), email: 'admin@seed.remotebpo.test', role: 'admin', name: 'Seed Admin', createdAt: daysAgo(60) });

  for (let i = 1; i <= employers; i++) {
    const user = { _id: objectId(), email: `employer${i}@seed.remotebpo.test`, role: 'employer', name: `${pick(FIRST)} ${pick(LAST)}`, createdAt: daysAgo(int(30, 60)) };
    users.push(user);
    const name = `${pick(COMPANY_WORDS)} ${pick(COMPANY_TYPES)} ${i}`;
    const company = {
      _id: objectId(), ownerId: user._id, name, slug: name.toLowerCase().replace(/\s+/g, '-'),
      website: `https://${name.toLowerCase().replace(/\s+/g, '')}.example.com`,
      industries: some(PROCESS_TYPES, 1, 3), verificationStatus: i <= Math.ceil(employers * 0.6) ? 'verified' : 'pending',
      createdAt: user.createdAt,
    };
    companies.push(company);

    for (let j = 1; j <= jobsPerCompany; j++) {
      const processType = pick(PROCESS_TYPES);
      const status = pick(JOB_STATUSES);
      const salaryMin = int(30, 80) * 1000;
      const published = status !== 'draft';
      jobs.push({
        _id: objectId(), companyId: company._id, title: JOB_TITLES[processType], slug: `${company.slug}-${processType.replace(/_/g, '-')}-${j}`,
        processType, status, languages: some(LANGUAGES, 1, 2), shift: pick(SHIFTS), tools: some(TOOLS, 1, 3),
        minTypingWpm: processType === 'data_entry' ? int(40, 60) : int(25, 40), salaryMin, salaryMax: salaryMin + int(10, 40) * 1000,
        salaryCurrency: 'LKR', experienceYears: int(0, 3),
        description: 'Fake job created by the seed script. Remote role, company provides training.',
        publishedAt: published ? daysAgo(int(1, 25)) : null, expiresAt: published ? daysAgo(-int(5, 30)) : null,
        createdAt: daysAgo(int(26, 30)),
      });
    }
  }

  for (let i = 1; i <= candidates; i++) {
    const user = { _id: objectId(), email: `candidate${i}@seed.remotebpo.test`, role: 'candidate', name: `${pick(FIRST)} ${pick(LAST)}`, createdAt: daysAgo(int(1, 45)) };
    users.push(user);
    candidateProfiles.push({
      _id: objectId(), userId: user._id, timezone: pick(TIMEZONES),
      languages: some(LANGUAGES, 1, 3).map((language, k) => ({ language, proficiency: k === 0 ? 'native' : pick(PROFICIENCY) })),
      tools: some(TOOLS, 1, 4), processExperience: some(PROCESS_TYPES, 1, 2), preferredShifts: some(SHIFTS, 1, 2),
      typingWpm: int(25, 75), typingAccuracy: int(85, 99),
      remoteSetup: { quietSpace: r() > 0.2, internetMbps: int(10, 100), headset: r() > 0.3, webcam: r() > 0.4, powerBackup: r() > 0.5 },
      createdAt: user.createdAt,
    });
  }

  // Applications only to published jobs, one per candidate per job (FR-104)
  const openJobs = jobs.filter((j) => j.status === 'published');
  for (const profile of candidateProfiles) {
    for (const job of some(openJobs, 0, Math.min(3, openJobs.length))) {
      applications.push({ _id: objectId(), jobId: job._id, candidateId: profile.userId, status: pick(APP_STATUSES), createdAt: daysAgo(int(0, 20)) });
    }
  }

  return { users, companies, candidateProfiles, jobs, applications };
}

module.exports = { makeSeedData, PROCESS_TYPES, LANGUAGES, SHIFTS, TOOLS, APP_STATUSES };
