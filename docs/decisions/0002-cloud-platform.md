# 0002 – Cloud platform and staging architecture

Status: Proposed (draft, Day 1)
Owner: Dulieka (with Dumindu, Suvathica, Navod)

## Context
- 14-day MVP; staging must be reachable by Day 8–10, hardened by Day 14 (SRS D.4).
- Two containers: `web` (Next.js) and `api` (Express). Dependencies: MongoDB (Atlas), Redis, S3-compatible storage.
- SRS allows Kubernetes or ECS, and asks for no hard lock-in to proprietary cloud services.
- Security requirements (SRS D.3): private networking for data stores, TLS 1.2+, least-privilege
  security groups, secrets injected at runtime, WAF in front of public endpoints, encrypted backups.
- Team is new to production cloud work; setup time and cost matter more than scale.

## Options considered
| Option | Pros | Cons |
|---|---|---|
| A. AWS ECS on Fargate | No cluster/node management; fast to set up; integrates with ALB, Secrets Manager, CloudWatch, ECR | AWS-specific task definitions (lock-in) |
| B. Managed Kubernetes (AWS EKS / GKE / DOKS) | Portable manifests; industry-standard skills | More setup and moving parts; control-plane cost on some providers; steep for 14 days |
| C. Single VM + Docker Compose | Cheapest and simplest | No zero-downtime deploys; weak fit for SRS availability and hardening goals |

## Decision
_To confirm with the lead after checking account access, budget and credits._
Leaning: Option A (ECS Fargate) for the MVP, keeping containers standard (plain Docker images,
config via env vars) so a later move to Kubernetes is possible.

## Proposed staging architecture
- Region: closest available to users and team (e.g. ap-south-1 Mumbai or ap-southeast-1 Singapore).
- VPC across 2 availability zones:
  - Public subnets: Application Load Balancer (HTTPS only, HTTP→HTTPS redirect), NAT gateway.
  - Private subnets: `web` and `api` tasks; Redis (ElastiCache). No public IPs on tasks.
- Security groups: ALB → web/api only; api → Redis only; nothing else inbound.
- MongoDB Atlas: access restricted to the VPC (private endpoint/peering if the tier supports it,
  otherwise IP allow-list of NAT egress IP only).
- Images: Amazon ECR with scan on push; CI also scans with Trivy.
- Secrets: AWS Secrets Manager or SSM Parameter Store, injected into tasks at runtime.
- TLS: ACM certificate on the ALB; AWS WAF managed rules in front of the ALB.
- Storage: private S3 bucket for resumes/logos, access via signed URLs only.
- Logs/metrics: CloudWatch Logs + container health checks.

## Consequences
- Suvathica can finalise the secret store (docs/secrets.md "To decide").
- Dumindu's CI pipeline pushes to ECR and deploys to ECS.
- Navod reviews security groups, WAF rules and IAM roles before staging goes live.
- Infra-as-code (Terraform) to live in `infra/` — to confirm with team.

## Open questions
- Cloud account / credits available? Budget limit?
- Is Kubernetes experience a learning goal for this internship (would favour Option B)?
- Custom domain for staging?