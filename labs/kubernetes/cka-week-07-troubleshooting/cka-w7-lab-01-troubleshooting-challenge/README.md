# CKA Week 7 Challenge - Fix the Broken Cluster (14 Scenarios)

**CKA Week 7** — CKA Week 7 - Troubleshooting (30% of the exam) · advanced · 140 points · pass mark 66% (the CKA exam pass mark)

## Mission

Get every broken object healthy again and prove each fix with live behavior, then write your root-cause notes to /root/diagnosis.md.

## Troubleshooting order (week 7 rule)

1. `kubectl get pods -n broken` - what phase are they in?
2. `kubectl describe pod <pod>` - the Events section names the cause.
3. `kubectl logs <pod> --previous` - the last crash.
4. `kubectl get endpoints <svc>` - does the Service reach anything?
5. `kubectl get netpol -A` - is a policy blocking you?

Time-box: **8 minutes per scenario** before opening SOLUTION.md. Log causes to `/root/diagnosis.md` - task 14 grades your notes.

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
| 1 | ipull: wrong image fixed to nginx:1.27 and pods Ready | 10 |
| 2 | crashy: container command fixed to sleep (pods Ready, no more CrashLoopBackOff) | 10 |
| 3 | huge: impossible cpu request fixed to 100m and pods Ready | 10 |
| 4 | zero-dep: scaled to 3 with 3 replicas Ready | 10 |
| 5 | broken-svc: targetPort corrected to 80; tester reaches the Service | 10 |
| 6 | no-ep-svc: selector corrected to app=web; Service has endpoints | 10 |
| 7 | oom: memory limit raised to 128Mi; pod Running (was OOMKilled) | 10 |
| 8 | env-app: missing GREETING=hello env added; pod Running | 10 |
| 9 | stuck-sc: PVC rescued from a missing StorageClass and now Bound | 10 |
| 10 | bad-job: fixed so it completes (status.succeeded >= 1) | 10 |
| 11 | sec-reader: reads /creds/password (secret key mapping fixed); pod Running | 10 |
| 12 | broken-ing: backend Service corrected; curl with Host header serves nginx | 10 |
| 13 | netpol-block: policy removed/relaxed; tester reaches web-svc again | 10 |
| 14 | /root/diagnosis.md documents the root causes (mentions ImagePullBackOff) | 10 |

Total: **140 points**
