# CKA Week 8 Mock Exam - 18 Questions, 120 Minutes

**CKA Week 8** — CKA Week 8 - Mock Exam Simulation · advanced · 180 points · pass mark 66% (the CKA exam pass mark)

## Mission

Score above 66% (the CKA pass mark) within 120 minutes. Then review SOLUTION.md and log every miss in mistakes.md before sitting killer.sh.



## How it works

- You get a real single-node **k3s** cluster plus a workstation shell. `kubectl` is preconfigured
  (`KUBECONFIG=/kube/config`). The cluster needs 1–3 minutes on first start; the terminal tells you
  when it is ready.
- Finish the tasks below, then press **Check** in the dashboard: your work is scored by
  `bash /check.sh` inside this workstation, task by task. You need **66%** to pass —
  you can re-check as often as you like.
- Each task is worth **10 points**. Checks verify **final cluster state**, not how you got there —
  imperative commands or YAML, both work.
- Time-box yourself: **6 min per task** before opening the solution,
  then log the miss in `mistakes.md`.
- Leave objects in the state the task asks for (checks run against the live cluster at check time).

## Environment notes

- The lab runs privileged containers (k3s needs them) — keep Docker Desktop resources at **4 GB+ memory / 2 CPUs**.
- Single-node cluster: use it for node-label/taint tasks exactly as written.
- k3s ships a local-path StorageClass and metrics-server, like the exam environment ships its own defaults.

## Tasks

| # | Task | Points |
|---|------|--------|
| 1 | Namespace exam created and set as the current-context namespace | 10 |
| 2 | Pod fast runs nginx:1.27 in exam and is Running | 10 |
| 3 | Deployment api: 4 replicas of nginx:1.27, all Ready | 10 |
| 4 | legacy-app updated to nginx:1.27 (revision >= 2) | 10 |
| 5 | ConfigMap exam-cm (KEY1=val1) and Secret exam-sec (PASS=topsecret) in exam | 10 |
| 6 | CronJob backup-cron runs daily at 01:00 (0 1 * * *) | 10 |
| 7 | Service api-svc (80) exposes deploy api with ready endpoints | 10 |
| 8 | Node tainted exam=drain:NoSchedule; pod tol-pod tolerates it and runs | 10 |
| 9 | RBAC: SA deployer + Role deployer-role (create deployments) + RoleBinding in exam | 10 |
| 10 | auth can-i: deployer SA CAN create deployments in exam | 10 |
| 11 | NetworkPolicy in exam: client cannot reach protected, DNS still works | 10 |
| 12 | Storage: PVC exam-pvc (1Gi, local-path) Bound and mounted in pod pvc-pod | 10 |
| 13 | etcd backup: snapshot copied to /root/exam-snap.db and verified | 10 |
| 14 | Helm release exam-rel installed in exam with replicaCount 2 | 10 |
| 15 | Kustomize overlay applied: kust-web at 2 replicas on nginx:1.28 in exam | 10 |
| 16 | Ingress exam-ing: exam.example.com -> api-svc verified with curl | 10 |
| 17 | fixme repaired: 2 replicas of nginx:1.27 all Ready (was 0 replicas, broken image) | 10 |
| 18 | /root/pod-ips.txt contains the live IP of pod fast | 10 |

Total: **180 points**
