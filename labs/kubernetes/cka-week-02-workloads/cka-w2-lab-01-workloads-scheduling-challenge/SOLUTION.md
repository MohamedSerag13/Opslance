# CKA Week 2 Challenge - Workloads and Scheduling — Solution

### Task 1 — upgrade-me updated to nginx:1.27 (revision >= 2)
```bash
kubectl -n w2 set image deploy/upgrade-me nginx=nginx:1.27
```

### Task 2 — rollback-me back on nginx:1.26 after update to 1.28 + undo (revision >= 3)
```bash
kubectl -n w2 set image deploy/rollback-me nginx=nginx:1.28 && kubectl -n w2 rollout undo deploy/rollback-me
```

### Task 3 — upgrade-me strategy: maxUnavailable=0, maxSurge=1 (no-downtime rolling update)
```bash
kubectl -n w2 patch deploy upgrade-me -p '{"spec":{"strategy":{"rollingUpdate":{"maxUnavailable":0,"maxSurge":1}}}}'
```

### Task 4 — HPA web-hpa on upgrade-me: min 2, max 6, CPU target 70%
```bash
kubectl -n w2 autoscale deploy upgrade-me --name=web-hpa --min=2 --max=6 --cpu-percent=70
```

### Task 5 — ConfigMap w2-config (MODE=fast) consumed as env by pod cm-env via envFrom
```bash
kubectl -n w2 create cm w2-config --from-literal=MODE=fast; kubectl -n w2 run cm-env --image=busybox:1.36 $do > e.yaml  # add envFrom: [{configMapRef: {name: w2-config}}]; kubectl apply -f e.yaml
```

### Task 6 — Secret w2-secret mounted at /etc/creds in pod sec-mount
```bash
kubectl -n w2 create secret generic w2-secret --from-literal=cred=secret123; kubectl -n w2 run sec-mount --image=nginx:1.27 $do > s.yaml  # add secret volume + volumeMounts; kubectl apply -f s.yaml
```

### Task 7 — Pod bootstrapper: init container writes index.html into emptyDir served by nginx
```bash
kubectl -n w2 run bootstrapper --image=nginx:1.27 $do > b.yaml; vim b.yaml  # initContainer busybox: sh -c "echo OK > /web-data/index.html"; shared emptyDir; nginx mounts it; apply
```

### Task 8 — Pod logger: busybox sidecar shares an emptyDir at /logs with the main container
```bash
kubectl -n w2 run logger --image=nginx:1.27 $do > l.yaml; vim l.yaml  # second busybox container tail -f /logs/x.log; shared emptyDir /logs; apply
```

### Task 9 — Job batch-job: completions 3, parallelism 2, backoffLimit 4
```bash
kubectl -n w2 create job batch-job --image=busybox:1.36 $do > j.yaml; vim j.yaml  # set completions/parallelism/backoffLimit; kubectl apply -f j.yaml
```

### Task 10 — CronJob nightly: schedule 30 2 * * *, not suspended
```bash
kubectl -n w2 create cronjob nightly --image=busybox:1.36 --schedule="30 2 * * *" -- date
```

### Task 11 — Node labeled disk=fast and pod pin-node lands there via nodeSelector
```bash
kubectl label node $(kubectl get nodes -o jsonpath="{.items[0].metadata.name}") disk=fast; kubectl -n w2 run pin-node --image=nginx:1.27 $do > p.yaml; vim p.yaml  # nodeSelector: {disk: fast}; apply
```

### Task 12 — Node tainted dedicated=cka:NoSchedule; pod tol-pod tolerates it and still runs
```bash
kubectl taint nodes $(kubectl get nodes -o jsonpath="{.items[0].metadata.name}") dedicated=cka:NoSchedule; kubectl -n w2 run tol-pod --image=nginx:1.27 $do > t.yaml; vim t.yaml  # tolerations: [{key: dedicated, operator: Equal, value: cka, effect: NoSchedule}]; apply
```
