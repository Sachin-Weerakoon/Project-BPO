# Kubernetes manifests (staging)

Design: [ADR 0002](../../docs/decisions/0002-cloud-platform.md). Target: k3s on Oracle Cloud Always Free ARM VMs.
Cluster setup steps: [k3s on Oracle runbook](../../docs/runbooks/k3s-oracle-setup.md).

| File | What |
|---|---|
| `namespace.yaml` | `remotebpo` namespace |
| `api-config.yaml` | non-secret API settings (ConfigMap) |
| `api.yaml` | API Deployment (2 replicas, rolling updates, /health + /ready probes) and Service |
| `web.yaml` | Next.js Deployment (2 replicas, HOSTNAME=0.0.0.0) and Service |
| `redis.yaml` | Redis for BullMQ and the Socket.io adapter (internal only, not persistent) |
| `ingress.yaml` | `/api` -> api, `/` -> web (Traefik, built into k3s) |
| `hpa.yaml` | autoscaling 2-4 pods at 70% CPU |
| `pdb.yaml` | keeps at least 1 api and 1 web pod running during node maintenance |
| `network-policies.yaml` | default deny; allows ingress->web, ingress/web->api, api->redis only |

## Not in Git
`api-secrets` (DATABASE_URL, JWT secrets, Supabase keys) is created by the deploy pipeline from
GitHub Actions secrets. Never commit real secrets.

## Check locally
```bash
kubectl kustomize infra/k8s/base                      # render, no cluster needed
kubectl apply -k infra/k8s/base --dry-run=server      # validate (namespace must exist)
```
Note: Docker Desktop validates NetworkPolicies but does not enforce them. k3s does.

## To do
- Real image names and tags from CI (Dumindu), arm64 builds
- TLS with cert-manager once the domain is known
- Health route for the web app (replace tcpSocket probes)
- Socket.io sticky sessions on the ingress
- Egress network policies (DNS, Supabase) after staging works
- Backup CronJob (pg_dump) from ADR 0002