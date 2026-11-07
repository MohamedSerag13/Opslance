# CKA Week 4 Challenge - RBAC, Certificates, Security Contexts

**CKA Week 4** — CKA Week 4 - Security, RBAC and Certificates · advanced · 120 points · pass mark 66% (the CKA exam pass mark)

## Mission

Build least-privilege RBAC for a service account, issue and approve a client certificate, create a kubeconfig for jane, run hardened pods, and enforce Pod Security Admission.



## How it works

- You get a real single-node **k3s** cluster plus a workstation shell. `kubectl` is preconfigured
  (`KUBECONFIG=/kube/config`). The cluster needs 1–3 minutes on first start; the terminal tells you
  when it is ready.
- Finish the tasks below, then press **Check** in the dashboard: your work is scored by
  `bash /check.sh` inside this workstation, task by task. You need **66%** to pass —
  you can re-check as often as you like.
- Each task is worth **10 points**. Checks verify **final cluster state**, not how you got there —
  imperative commands or YAML, both work.
- Time-box yourself: **8 min per task** before opening the solution,
  then log the miss in `mistakes.md`.
- Leave objects in the state the task asks for (checks run against the live cluster at check time).

## Environment notes

- The lab runs privileged containers (k3s needs them) — keep Docker Desktop resources at **4 GB+ memory / 2 CPUs**.
- Single-node cluster: use it for node-label/taint tasks exactly as written.
- k3s ships a local-path StorageClass and metrics-server, like the exam environment ships its own defaults.

## Tasks

| # | Task | Points |
|---|------|--------|
| 1 | ServiceAccount dev-sa exists in ns dev | 10 |
| 2 | Role pods-reader in dev allows get,list,watch on pods | 10 |
| 3 | RoleBinding pods-reader-binding binds pods-reader to SA dev:dev-sa | 10 |
| 4 | auth can-i: the SA CAN list pods in dev | 10 |
| 5 | auth can-i: the SA CANNOT delete pods in dev (least privilege) | 10 |
| 6 | ClusterRole node-reader allows get,list,watch on nodes | 10 |
| 7 | ClusterRoleBinding grants node-reader to dev-sa; can-i get nodes -> yes | 10 |
| 8 | CSR jane-csr Approved with certificate issued | 10 |
| 9 | /home/intern/jane.kubeconfig authenticates jane (can-i prints no) | 10 |
| 10 | Pod sc-pod runs as non-root (runAsNonRoot=true, runAsUser=1000) | 10 |
| 11 | Pod sc-pod drops ALL capabilities and adds NET_BIND_SERVICE | 10 |
| 12 | ns secure enforces PSA baseline; a hostPath pod is rejected there | 10 |

Total: **120 points**
