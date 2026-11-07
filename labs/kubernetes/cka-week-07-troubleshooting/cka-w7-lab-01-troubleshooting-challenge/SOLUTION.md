# CKA Week 7 Challenge - Fix the Broken Cluster (14 Scenarios) — Solution

### Task 1 — ipull: wrong image fixed to nginx:1.27 and pods Ready
```bash
kubectl -n broken set image deploy/ipull nginx=nginx:1.27  # ImagePullBackOff: describe shows the bad tag
```

### Task 2 — crashy: container command fixed to sleep (pods Ready, no more CrashLoopBackOff)
```bash
kubectl -n broken patch deploy crashy --type=json -p="[{\"op\":\"replace\",\"path\":\"/spec/template/spec/containers/0/command\",\"value\":[\"sh\",\"-c\",\"sleep 3600\"]}]"  # logs showed exit 1
```

### Task 3 — huge: impossible cpu request fixed to 100m and pods Ready
```bash
kubectl -n broken patch deploy huge -p="{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"nginx\",\"resources\":{\"requests\":{\"cpu\":\"100m\"}}}]}}}}"  # events said: Insufficient cpu (500 = 500 cores)
```

### Task 4 — zero-dep: scaled to 3 with 3 replicas Ready
```bash
kubectl -n broken scale deploy zero-dep --replicas=3
```

### Task 5 — broken-svc: targetPort corrected to 80; tester reaches the Service
```bash
kubectl -n broken patch svc broken-svc -p="{\"spec\":{\"ports\":[{\"port\":80,\"targetPort\":80}]}}"  # endpoints existed but connection was refused: wrong targetPort
```

### Task 6 — no-ep-svc: selector corrected to app=web; Service has endpoints
```bash
kubectl -n broken patch svc no-ep-svc -p="{\"spec\":{\"selector\":{\"app\":\"web\"}}}"  # a Service with no endpoints has a selector that matches nothing
```

### Task 7 — oom: memory limit raised to 128Mi; pod Running (was OOMKilled)
```bash
kubectl -n broken get pod oom -o yaml > o.yaml; vim o.yaml  # limits.memory 5Mi -> 128Mi; kubectl replace --force -f o.yaml (pod resources are immutable)
```

### Task 8 — env-app: missing GREETING=hello env added; pod Running
```bash
kubectl -n broken get pod env-app -o yaml > e.yaml; vim e.yaml  # add env: [{name: GREETING, value: hello}]; kubectl replace --force -f e.yaml
```

### Task 9 — stuck-sc: PVC rescued from a missing StorageClass and now Bound
```bash
kubectl -n broken patch pvc stuck-sc -p="{\"spec\":{\"storageClassName\":\"local-path\"}}"
```

### Task 10 — bad-job: fixed so it completes (status.succeeded >= 1)
```bash
kubectl -n broken delete job bad-job; kubectl -n broken create job bad-job --image=busybox:1.36 -- echo done  # job pod templates are immutable - recreate it
```

### Task 11 — sec-reader: reads /creds/password (secret key mapping fixed); pod Running
```bash
kubectl -n broken get pod sec-reader -o yaml > s.yaml; vim s.yaml  # volume items mapped key password to path pass; fix the mapping or the mountPath; kubectl replace --force -f s.yaml
```

### Task 12 — broken-ing: backend Service corrected; curl with Host header serves nginx
```bash
kubectl -n broken patch ingress broken-ing -p="{\"spec\":{\"rules\":[{\"host\":\"broken.example.com\",\"http\":{\"paths\":[{\"path\":\"/\",\"pathType\":\"Prefix\",\"backend\":{\"service\":{\"name\":\"web-svc\",\"port\":{\"number\":80}}}}]}}]}}"  # 404 meant the backend svc name did not exist
```

### Task 13 — netpol-block: policy removed/relaxed; tester reaches web-svc again
```bash
kubectl -n broken delete netpol deny-all  # or patch it to allow traffic from the tester labels
```

### Task 14 — /root/diagnosis.md documents the root causes (mentions ImagePullBackOff)
```bash
vim /root/diagnosis.md  # one line per scenario: symptom, root cause, fix - this is your mistakes.md habit from the plan
```
