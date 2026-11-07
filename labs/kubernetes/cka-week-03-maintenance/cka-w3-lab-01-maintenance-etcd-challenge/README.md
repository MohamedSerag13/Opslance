# CKA Week 3 Challenge - Maintenance, etcd, Logging

**CKA Week 3** — CKA Week 3 - Cluster Maintenance, etcd, Logging and Monitoring · advanced · 120 points · pass mark 66% (the CKA exam pass mark)

## Mission

Prove a safe drain, take a verified etcd snapshot and restore from it, and capture the observability evidence (logs --previous, top, events, describe) the exam asks for.



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
| 1 | Drain (--ignore-daemonsets --delete-emptydir-data) then uncordon: bare-worker evicted, node schedulable | 10 |
| 2 | etcd-helper pod Running in kube-system (k3s image, hostNetwork, /tls + /snapshots hostPaths) | 10 |
| 3 | etcd snapshot saved via helper and copied to /root/etcd-backup.db (valid snapshot file) | 10 |
| 4 | /root/snapshot-status.txt captures the snapshot status table (DB size present) | 10 |
| 5 | /root/backup-manifest.txt contains the snapshot sha256 | 10 |
| 6 | Restore drilled: etcdutl restore produced /snapshots/restored/member inside the helper | 10 |
| 7 | /root/crash.log captures logs --previous of the crash-looping fail-log deployment | 10 |
| 8 | /root/top-pods.txt has live metrics-server output for all pods | 10 |
| 9 | /root/events-ops.txt shows events mentioning fail-log | 10 |
| 10 | /root/static-manifests.txt lists the k3s static pod manifests (coredns visible) | 10 |
| 11 | /root/node-describe.txt is a node describe output containing Conditions | 10 |
| 12 | etcd endpoint health verified through the helper | 10 |

Total: **120 points**
