# Runbook: k3s cluster on Oracle Cloud (staging)

- **Owner:** Dulieka (DevOps). Reviewers: Navod (security), Dumindu (CI/deploy)
- **Status:** v1 draft. Not run yet: waiting for the lead's decisions and the company Oracle account.
- **Design:** [ADR 0002](../decisions/0002-cloud-platform.md). Manifests: [infra/k8s](../../infra/k8s/README.md)

## 0. Before you start
- [ ] Lead confirmed k3s on Oracle (ADR 0002 assumption A2)
- [ ] Company Oracle account exists (sign-up needs a credit card for verification)
- [ ] Home region chosen: Mumbai, Hyderabad or Singapore (cannot be changed later)
- [ ] Current Always Free Arm limits checked in the console (reportedly 2 OCPU / 12 GB in 2026)
- [ ] Team public IPs collected (for SSH and Kubernetes API access)

## 1. Network (Oracle console)
1. Create a VCN with an internet gateway and one public subnet ("VCN with Internet Connectivity" wizard).
2. Security list ingress rules:

| Port | Source | Why |
|---|---|---|
| 22 (SSH) | team IPs only | admin access |
| 6443 (Kubernetes API) | team IPs only | kubectl from laptops / CI |
| 80, 443 | 0.0.0.0/0 | public web traffic (Traefik) |

Nothing else open. Redis and pod traffic stay inside the cluster.

## 2. Create the VM(s)
- Shape: `VM.Standard.A1.Flex` (Ampere, ARM), image Ubuntu 24.04 **aarch64**.
- Size within the Always Free limit, e.g. one VM using the full allowance, or 1 server + 1 agent.
- Add your SSH public key. Boot volume within the free block storage allowance.
- If "Out of capacity": retry later or try another availability domain in the same region.

## 3. Prepare the OS (each VM)
```bash
sudo apt update && sudo apt -y upgrade
```
Oracle's Ubuntu images ship with host firewall (iptables) rules that only allow SSH.
Allow 80, 443 and 6443 on the VM too, then save the rules:
```bash
sudo iptables -I INPUT -p tcp -m multiport --dports 80,443,6443 -j ACCEPT
sudo netfilter-persistent save
```
(Check with `sudo iptables -L INPUT -n --line-numbers` that the ACCEPT rule is above any REJECT rule.)

## 4. Install k3s (server)
```bash
curl -sfL https://get.k3s.io | sh -s - server \
  --secrets-encryption \
  --write-kubeconfig-mode 600 \
  --tls-san <PUBLIC_IP>
sudo k3s kubectl get nodes          # STATUS should be Ready
```
- `--secrets-encryption`: Kubernetes Secrets are encrypted at rest (ADR 0002 "Secrets").
- k3s includes Traefik (ingress) and metrics-server (needed by the autoscaler).

## 5. Join an agent node (only if using 2 VMs)
On the server: `sudo cat /var/lib/rancher/k3s/server/node-token`. On the agent:
```bash
curl -sfL https://get.k3s.io | K3S_URL=https://<SERVER_PRIVATE_IP>:6443 K3S_TOKEN=<TOKEN> sh -
```
Allow 6443 and the k3s ports between the two VMs inside the VCN (private IPs only).

## 6. Access from a laptop
1. Copy `/etc/rancher/k3s/k3s.yaml` from the server to your laptop (never commit it).
2. Replace `127.0.0.1` with the server's public IP.
3. `kubectl get nodes` from the laptop. Port 6443 is only open to team IPs.

## 7. Checks
```bash
kubectl get nodes -o wide
kubectl top nodes                           # metrics-server works -> autoscaling can work
kubectl get pods -n kube-system             # traefik, coredns, metrics-server Running
```

## 8. Deploy the app
1. Create the namespace and the secret (later done by the CI pipeline from GitHub Actions secrets):
   ```bash
   kubectl create namespace remotebpo
   kubectl create secret generic api-secrets -n remotebpo \
     --from-literal=DATABASE_URL='<supabase pooler url>' \
     --from-literal=JWT_ACCESS_SECRET='<value>' --from-literal=JWT_REFRESH_SECRET='<value>'
   ```
   Do not paste real values into shared notes or chat. Clear your shell history afterwards.
2. `kubectl apply -k infra/k8s/base`
3. `kubectl get pods -n remotebpo -w` until all pods are Running and Ready.
4. Network policies are enforced on k3s: if probes fail after applying them, check
   `kubectl describe pod` events and adjust `network-policies.yaml`.

## 9. Later
- cert-manager + Let's Encrypt for HTTPS once the domain is known
- Backup CronJob: `infra/backup/cronjob.example.yaml` (Suvethica, runbook: [backup-restore.md](backup-restore.md)).
  Before enabling: create the Object Storage bucket + Customer Secret Keys, set `S3_ENDPOINT`,
  create `backup-secrets`, and check whether `DATABASE_DIRECT_URL` must be the Supabase
  **session pooler** URL (IPv4, port 5432) instead of the direct (IPv6) address.
  When egress network policies are added, allow pg-backup -> DNS, Supabase, Object Storage.
- Uptime check on `/health`, alerts (with Suvethica)

## 10. Teardown (end of internship)
1. Export the database (`pg_dump`) and store it as agreed with the lead.
2. `kubectl delete namespace remotebpo`
3. Terminate the VMs and delete the VCN in the Oracle console.