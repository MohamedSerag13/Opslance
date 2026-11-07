# CKA Week 5 Challenge - Services, DNS, Ingress, NetworkPolicy

**CKA Week 5** — CKA Week 5 - Services and Networking · advanced · 120 points · pass mark 66% (the CKA exam pass mark)

## Mission

Wire up all Service types, prove DNS, publish two virtual hosts with TLS through Ingress, create a Gateway API route, and lock down ns secure with default-deny plus surgical allow rules.



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
| 1 | Service web-a-svc (ClusterIP 80) in apps has ready endpoints | 10 |
| 2 | Service web-a-np in apps is a NodePort | 10 |
| 3 | Headless Service web-a-headless in apps (clusterIP: None) | 10 |
| 4 | ExternalName Service external-db points to db.example.com | 10 |
| 5 | Cluster DNS resolves web-a-svc.apps.svc.cluster.local from a pod | 10 |
| 6 | Ingress app-ingress routes app.example.com to web-a-svc (verified with curl) | 10 |
| 7 | Second virtual host api.example.com routes to web-b-svc (curl shows the httpd page) | 10 |
| 8 | TLS ingress: secret app-tls serves https for app.example.com (curl -k) | 10 |
| 9 | NetworkPolicy default-deny in secure: client CANNOT reach protected (live traffic) | 10 |
| 10 | Allow rule: client2 (label access=allowed) CAN reach protected | 10 |
| 11 | DNS egress preserved: client can still resolve kubernetes.default | 10 |
| 12 | Gateway API: a Gateway and an HTTPRoute exist (class cka-gc) | 10 |

Total: **120 points**
