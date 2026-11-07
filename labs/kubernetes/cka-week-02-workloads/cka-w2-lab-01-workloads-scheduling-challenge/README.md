# CKA Week 2 Challenge - Workloads and Scheduling

**CKA Week 2** — CKA Week 2 - Workloads and Scheduling · advanced · 120 points · pass mark 66% (the CKA exam pass mark)

## Mission

Master Week 2: update and roll back deployments with strategy control, inject configuration, run init containers and Jobs, place pods via labels and tolerations, and autoscale.



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
| 1 | upgrade-me updated to nginx:1.27 (revision >= 2) | 10 |
| 2 | rollback-me back on nginx:1.26 after update to 1.28 + undo (revision >= 3) | 10 |
| 3 | upgrade-me strategy: maxUnavailable=0, maxSurge=1 (no-downtime rolling update) | 10 |
| 4 | HPA web-hpa on upgrade-me: min 2, max 6, CPU target 70% | 10 |
| 5 | ConfigMap w2-config (MODE=fast) consumed as env by pod cm-env via envFrom | 10 |
| 6 | Secret w2-secret mounted at /etc/creds in pod sec-mount | 10 |
| 7 | Pod bootstrapper: init container writes index.html into emptyDir served by nginx | 10 |
| 8 | Pod logger: busybox sidecar shares an emptyDir at /logs with the main container | 10 |
| 9 | Job batch-job: completions 3, parallelism 2, backoffLimit 4 | 10 |
| 10 | CronJob nightly: schedule 30 2 * * *, not suspended | 10 |
| 11 | Node labeled disk=fast and pod pin-node lands there via nodeSelector | 10 |
| 12 | Node tainted dedicated=cka:NoSchedule; pod tol-pod tolerates it and still runs | 10 |

Total: **120 points**
