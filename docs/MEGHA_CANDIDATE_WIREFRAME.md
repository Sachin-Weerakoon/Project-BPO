# Candidate Profile Wireframe — RemoteBPO Hub

**Owner:** Megha | **Cycle:** 1 (Days 1–2) | **Status:** Low-fidelity proposal

## Purpose
Plan a responsive candidate profile display and the reusable components needed before the full editable profile form scheduled for Days 3–4.

## Main sections
1. Candidate header: full name, headline, location, timezone.
2. Languages: language and proficiency.
3. Skills and BPO tools.
4. Process experience and education.
5. Preferred shifts / availability.
6. Remote workspace: quiet workspace, internet speed, headset, webcam, power backup.
7. Resume filename (placeholder only; uploads come later).

## Low-fidelity desktop wireframe

```text
+----------------------------------------------------------+
| Candidate profile                                        |
| Candidate Name — Professional headline                   |
| Location • Timezone                                      |
+----------------------------------------------------------+
| Languages                                                |
| [English: Advanced]  [Sinhala: Native]                   |
+----------------------------------------------------------+
| Skills & Tools                                           |
| [Customer support] [Typing] [Zendesk]                    |
+----------------------------------------------------------+
| BPO Process Experience  | Education                      |
| [Voice] [Non-Voice]     | Undergraduate                  |
+----------------------------------------------------------+
| Preferred Shifts                                         |
| [Night] [Flexible]                                       |
+----------------------------------------------------------+
| Remote workspace                                         |
| Quiet space ✓  Headset ✓  Webcam ✓  Power backup —        |
| Internet speed: 50 Mbps                                  |
+----------------------------------------------------------+
| Resume (filename only)                                   |
+----------------------------------------------------------+
```

On mobile, content stacks vertically. Do not imply real backend integration in Cycle 1.

## Component hierarchy

```text
CandidateProfile
  ├── Header
  ├── Section: Languages
  ├── Section: Skills & tools
  ├── Section: BPO experience
  ├── Section: Preferred shifts
  └── Section: Remote workspace / Resume
JobList
  └── JobCard (repeated for each job)
```

## Requirement alignment
- Candidate profile: FR-020 (languages/proficiency, skills, tools, process experience, education, resume).
- Remote checklist: FR-021 (quiet space, internet speed, headset, webcam, power backup).
- Preferred shifts: FR-022.
- Job card/list: foundation for search/list screens (FR-080) scheduled for later cycles.

**Backend coordination:** Agree field names and enums with Sathsarani before connecting APIs. The current UI uses fictional mock data.
