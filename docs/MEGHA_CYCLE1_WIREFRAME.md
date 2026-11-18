# Megha — Cycle 1 Candidate UI wireframe and field proposal

## Candidate profile (read-only component, not Day 3–4 editable form)

```text
+---------------------------------------------------------+
| CANDIDATE PROFILE                                       |
| Name / headline                                         |
| Location / timezone                                     |
|---------------------------------------------------------|
| Languages: [English - Advanced] [Sinhala - Native]      |
| Skills & tools: [Customer Support] [Zendesk]            |
| BPO experience: [Voice] [Non-Voice] + years + education  |
| Preferred shifts: [Night] [Rotational]                  |
| Workspace readiness: [Quiet] [Headset] [Webcam] [Backup] |
| Internet speed + resume filename                        |
+---------------------------------------------------------+
```

## Job Card / List

```text
+------------------------+ +------------------------+
| COMPANY                | | COMPANY                |
| Job title              | | Job title              |
| Location · Remote      | | Location · Remote      |
| [Process] [Type]       | | [Process] [Type]       |
| [Shift] [Timezone]     | | [Shift] [Timezone]     |
| Languages              | | Languages              |
| Salary / posted label  | | Salary / posted label  |
+------------------------+ +------------------------+
```

## Frontend/API handoff

- `apps/web/src/types/candidate.ts` is proposed CandidateProfile shape; confirm exact keys/enums with Sathsarani.
- `apps/web/src/types/job.ts` is proposed Job UI shape; confirm exact shape when job API is implemented.
- Day 1–2 components are **read-only**; save/edit, upload, search filters, alerts, apply action, typing test belong to later cycles.
- UI does not store personal data or require credentials.
- Do not change Duleesha's Next.js scaffold, auth components, layouts, or package files.
- Sample data is safe to use only in local/preview files, not as a real API response.
