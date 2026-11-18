# Kubernetes manifests (staging)

Design: [ADR 0002](../../docs/decisions/0002-cloud-platform.md). Target: k3s on Oracle Cloud Always Free ARM VMs.

| File | What |
|---|---|
| `namespace.yaml` | `remotebpo` namespace |
| `api-config.yaml` | non-secret API settings (ConfigMap) |
| `api.yaml` | API Deployment (2 replicas, rolling updates, /health + /ready probes) and Service |
| `web.yaml` | Next.js Deployment (2 replicas) and Service |
| `redis.yaml` | Redis for BullMQ and the Socket.io adapter (internal only, not persistent) |
| `ingress.yaml` | `/api` -> api, `/` -> web (Traefik, built into k3s) |
| `hpa.yaml` | autoscaling 2-4 pods at 70% CPU |

## Not in Git
`api-secrets` (DATABASE_URL, JWT secrets, Supabase keys) is created by the deploy pipeline from
GitHub Actions secrets. Never commit real secrets.

## Check locally
```bash
kubectl kustomize infra/k8s/base                      # render, no cluster needed
kubectl apply -k infra/k8s/base --dry-run=server      # validate against a cluster
```

## To do
- Real image names and tags from CI (Dumindu), arm64 builds
- TLS with cert-manager once the domain is known
- Health route for the web app (replace tcpSocket probes)
- Socket.io sticky sessions on the ingress
- Backup CronJob (pg_dump) from ADR 0002