# CKA Week 1 Speed Drill - 40 kubectl Tasks

**CKA Week 1** — CKA Week 1 - Foundations and kubectl Speed · advanced · 400 points · pass mark 66% (the CKA exam pass mark)

## Mission

Complete all 40 tasks: set up the exam shell, create namespaces, pods, deployments, services, config objects and export YAML - at speed, from memory, with the docs closed.

## Speed rules (from your plan)

- Start every lab block with a 10-minute warm-up: 5 imperative creations, no copy-paste.
- Time-box each task to 5 minutes before opening `SOLUTION.md`; log every miss in `mistakes.md`.
- Gate for the week: pod, deployment, service and namespace each created in under 60 seconds without the docs.

## How it works

- You get a real single-node **k3s** cluster plus a workstation shell. `kubectl` is preconfigured
  (`KUBECONFIG=/kube/config`). The cluster needs 1–3 minutes on first start; the terminal tells you
  when it is ready.
- Finish the tasks below, then press **Check** in the dashboard: your work is scored by
  `bash /check.sh` inside this workstation, task by task. You need **66%** to pass —
  you can re-check as often as you like.
- Each task is worth **10 points**. Checks verify **final cluster state**, not how you got there —
  imperative commands or YAML, both work.
- Time-box yourself: **5 min per task** before opening the solution,
  then log the miss in `mistakes.md`.
- Leave objects in the state the task asks for (checks run against the live cluster at check time).

## Environment notes

- The lab runs privileged containers (k3s needs them) — keep Docker Desktop resources at **4 GB+ memory / 2 CPUs**.
- Single-node cluster: use it for node-label/taint tasks exactly as written.
- k3s ships a local-path StorageClass and metrics-server, like the exam environment ships its own defaults.

## Tasks

| # | Task | Points |
|---|------|--------|
| 1 | alias k=kubectl persisted in /root/.bashrc | 10 |
| 2 | $do dry-run helper (dry-run=client -o yaml) persisted in /root/.bashrc | 10 |
| 3 | $now force-delete helper (--force --grace-period=0) persisted in /root/.bashrc | 10 |
| 4 | kn namespace-switch helper persisted in /root/.bashrc | 10 |
| 5 | kubectl bash completion wired for k (__start_kubectl) in /root/.bashrc | 10 |
| 6 | ~/.vimrc has expandtab and tabstop=2 | 10 |
| 7 | Namespace stage exists | 10 |
| 8 | Namespace billing exists | 10 |
| 9 | Namespace stage carries label env=dev | 10 |
| 10 | Pod utils runs in stage with busybox:1.36 and a sleep command | 10 |
| 11 | Pod web-pod runs image nginx:1.27 in stage | 10 |
| 12 | Pod env-demo in stage has env APP_ENV=production | 10 |
| 13 | Pod api-pod in stage carries labels app=api and tier=backend | 10 |
| 14 | Pod redis-pod runs redis:7-alpine in billing | 10 |
| 15 | Pod res-demo in stage requests cpu=100m memory=128Mi | 10 |
| 16 | Pod res-demo limits cpu=250m memory=256Mi | 10 |
| 17 | Pod multi in stage has exactly 2 containers (one nginx, one busybox) | 10 |
| 18 | Pod anno-pod in stage carries annotation description=week1-drill | 10 |
| 19 | Deployment web-dep in stage runs nginx:1.27 with >= 3 replicas | 10 |
| 20 | Deployment web-dep scaled to exactly 5 replicas | 10 |
| 21 | Deployment canary (seeded at 1.26) updated to nginx:1.27 with revision >= 2 | 10 |
| 22 | Deployment rollback-me shows >= 3 revisions (1.26 -> 1.28 -> undo) | 10 |
| 23 | rollback-me image is back to nginx:1.26 after the undo | 10 |
| 24 | Service web-svc in stage: ClusterIP, port 80, targetPort 80 | 10 |
| 25 | Service web-np in stage is a NodePort on 30080 | 10 |
| 26 | Service web-svc has at least 1 ready endpoint | 10 |
| 27 | ConfigMap app-cm in stage has data KEY=value | 10 |
| 28 | Secret app-sec in stage carries PASS=s3cr3t | 10 |
| 29 | /root/secret-value.txt contains the decoded PASS value s3cr3t | 10 |
| 30 | ServiceAccount pipeline-sa exists in stage | 10 |
| 31 | Deployment web-dep carries annotation owner=team-x | 10 |
| 32 | Job seed-job exists in stage | 10 |
| 33 | CronJob report-cron in stage runs every 5 minutes | 10 |
| 34 | Seeded pod doomed (default ns) is deleted | 10 |
| 35 | /root/pod.yaml is a Pod manifest using an nginx image | 10 |
| 36 | /root/dep.yaml is a Deployment manifest with replicas: 3 | 10 |
| 37 | /root/pod-names.txt lists >= 3 real pod names from stage | 10 |
| 38 | Some node carries label env=training | 10 |
| 39 | Pod applied-pod runs httpd:2.4 in stage (export, edit, apply) | 10 |
| 40 | /root/events.txt captures cluster events (non-empty) | 10 |

Total: **400 points**
