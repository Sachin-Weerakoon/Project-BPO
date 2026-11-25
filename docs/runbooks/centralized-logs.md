# Runbook: centralized logs (staging)

- **Owner:** Suvethica (DevOps, Day 8). Review: Dulieka (cluster), Navod (what leaves the cluster)
- **Status:** v1. For staging on k3s ([ADR 0002](../decisions/0002-cloud-platform.md)). Log format: [logging.md](../logging.md).
- **Files:** [`infra/k8s/logging/`](../../infra/k8s/logging/)

## 1. How it works

`kubectl logs` only shows the logs of pods that still exist, and a pod's logs are deleted with the pod.
So one small **Grafana Alloy** pod reads the logs of every pod in the `remotebpo` namespace and sends them to
**Grafana Cloud Logs** (Loki). Searching there also works after a crash, a restart or a new deploy.

| Part | What it does |
|---|---|
| `alloy` Deployment (1 pod) | finds the pods in `remotebpo` and reads their logs through the Kubernetes API (no access to the node's disk) |
| Processing (`config.alloy`) | reads the JSON fields of API logs, **drops `debug`** (health checks), **masks `Bearer` tokens**, uses the time the app wrote |
| Grafana Cloud Logs (free plan) | stores and searches the logs: 50 GB a month, kept 14 days |

| Field in Grafana | From | Type |
|---|---|---|
| `namespace`, `app`, `pod`, `container`, `cluster` | Kubernetes | label |
| `level` | `level` in the log line | label |
| `request_id`, `status`, `duration_ms` | `requestId`, `status`, `durationMs` | searchable field (structured metadata), **not** a label, so Loki stays fast and cheap |

Plain-text logs (web, Redis) are kept as they are.

**Security**
- Alloy can only **list pods and read pod logs in `remotebpo`** (a Role, not a ClusterRole).
- It runs as non-root with a read-only filesystem, and no one can reach it from outside (Dulieka's default-deny network policy).
- The Grafana Cloud token is in the Secret `grafana-cloud-logs`, created by the pipeline, never in Git.
- The API never logs secrets or personal data ([logging.md](../logging.md) section 4). Masking `Bearer` tokens is only a safety net.

## 2. One-time setup

1. **Grafana Cloud account** owned by the company email (the lead), free plan. Create a stack (region close to the Oracle region).
2. In the stack: **Connections → Loki → Send logs**. Note the **URL** (`https://logs-prod-<n>.grafana.net/loki/api/v1/push`) and the **user** (a number).
3. **Access policy token** with scope `logs:write` only (Administration → Cloud access policies). This is the password.
4. Put the three values in GitHub Actions secrets (environment `staging`): `LOKI_URL`, `LOKI_USERNAME`, `LOKI_PASSWORD`.
5. The deploy job creates the Secret (same pattern as `api-secrets` in [secrets.md](../secrets.md)):

```bash
kubectl -n remotebpo create secret generic grafana-cloud-logs \
  --from-literal=LOKI_URL="$LOKI_URL" \
  --from-literal=LOKI_USERNAME="$LOKI_USERNAME" \
  --from-literal=LOKI_PASSWORD="$LOKI_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -
```

6. Deploy the collector after the base:

```bash
kubectl apply -k infra/k8s/logging
kubectl -n remotebpo get pods -l app=alloy          # READY 1/1
kubectl -n remotebpo logs deploy/alloy --tail=50    # no "error sending batch" lines
```

## 3. Searching logs (Grafana → Explore → Loki)

| I want to see | Query |
|---|---|
| All API logs | `{namespace="remotebpo", app="api"}` |
| Only errors | `{app="api", level="error"}` |
| Everything for one request (the `X-Request-Id` a user or the web app reports) | `{app="api"} \| request_id="<id>"` |
| Server errors (5xx) | `{app="api"} \| status >= 500` |
| Slow requests (over 1 second) | `{app="api"} \| duration_ms > 1000` |
| One path | `{app="api"} \| json \| path="/api/v1/jobs"` |
| Logs of the crashed pod before the restart | `{app="api", pod="<pod name>"}` |
| Errors per minute (for a dashboard or alert) | `sum(count_over_time({app="api", level="error"}[1m]))` |

## 4. If something is wrong

| Problem | Check |
|---|---|
| No logs in Grafana | `kubectl -n remotebpo logs deploy/alloy`: `401` = wrong user or token, `404` = wrong URL |
| Alloy pod not starting | `kubectl -n remotebpo describe pod -l app=alloy`: Secret `grafana-cloud-logs` missing? |
| Some pods missing | Alloy reads only the `remotebpo` namespace; check the pod has an `app` label |
| Lines arrive twice | `replicas` must be 1 |
| Free plan limit close | Grafana Cloud → Usage. First check that no pod logs at `debug` in staging (`LOG_LEVEL=info`) |

## 5. Test locally (no cluster needed)

`infra/k8s/logging/test/config.test.alloy` has the **same processing steps** (the block between the
`PROCESS` markers must stay identical to `config.alloy`), but reads log files and writes to a local Loki.

1. Download [Loki](https://github.com/grafana/loki/releases) and [Alloy](https://github.com/grafana/alloy/releases) (Linux zip files).
2. Start Loki with a single-node config (`auth_enabled: false`, filesystem storage, `allow_structured_metadata: true`).
3. Put sample API logs in a folder as `api.log` (and a plain-text `web.log`), then:

```bash
TEST_LOG_DIR=./sample LOKI_URL=http://127.0.0.1:3100/loki/api/v1/push \
  alloy run infra/k8s/logging/test/config.test.alloy --storage.path=/tmp/alloy
```

4. Query `http://127.0.0.1:3100/loki/api/v1/query_range` with the searches from section 3.

Tested on 25 Nov 2026 with Loki 3.3.2 and Alloy 1.5.1, using real logs from `apps/api` (info, 404, 500, `/health`, a line containing a token):

| Check | Result |
|---|---|
| Errors only (`level="error"`) | 1 line: `/boom`, status 500 |
| One request by `request_id` | the 404 request only |
| `/health` (debug) dropped | 0 lines |
| `Bearer` token masked | `Bearer [REDACTED]`, secret not stored |
| Plain-text web line | kept as it is |
| Time | the app's time (`time` field), not the time Alloy read it |
| Index labels | only `app`, `level`, `namespace`, `cluster` (+ `filename` in the file test) |

The cluster config (`config.alloy`) was also loaded with Alloy 1.5.1: every part is accepted, and only the
Kubernetes parts wait for a cluster. The manifests pass `kustomize build` and `kubeconform -strict` (5 resources).
