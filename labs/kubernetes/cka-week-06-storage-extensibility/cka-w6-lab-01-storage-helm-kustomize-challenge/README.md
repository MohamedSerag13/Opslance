# CKA Week 6 Challenge - Storage, Helm, Kustomize, CRDs

**CKA Week 6** — CKA Week 6 - Storage, Helm, Kustomize and Extension Points · advanced · 120 points · pass mark 66% (the CKA exam pass mark)

## Mission

Bind static and dynamic volumes, expand a StorageClass, rescue a stuck PVC, run a full Helm lifecycle (install/upgrade/rollback/template) and ship an overlay with Kustomize, then extend the API with a CRD.



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
| 1 | PV manual-pv: 1Gi, RWO, hostPath /mnt/data | 10 |
| 2 | PVC manual-pvc is Bound to manual-pv | 10 |
| 3 | Pod pvc-user mounts manual-pvc at /usr/share/nginx/html and runs | 10 |
| 4 | Dynamic PVC dyn-pvc (1Gi, storageClassName local-path) is Bound | 10 |
| 5 | Rescue: seeded pending-pvc (bad StorageClass) is now Bound | 10 |
| 6 | StorageClass fast: local-path provisioner, Retain, allowVolumeExpansion | 10 |
| 7 | Helm release webapp installed in w6 with replicaCount 2 | 10 |
| 8 | Helm upgrade pins image.tag=1.28 | 10 |
| 9 | Helm rollback executed (history shows a Rollback entry) | 10 |
| 10 | helm template output saved to /root/chart-render.yaml (Deployment + ConfigMap) | 10 |
| 11 | Kustomize overlay prod applied: cka-web at 3 replicas on nginx:1.28 | 10 |
| 12 | CRD databases.example.com Established + CR my-db with spec.size=small | 10 |

Total: **120 points**
