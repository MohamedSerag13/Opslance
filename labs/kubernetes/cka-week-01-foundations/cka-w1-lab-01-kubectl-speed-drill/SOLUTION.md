# CKA Week 1 Speed Drill - 40 kubectl Tasks — Solution

### Task 1 — alias k=kubectl persisted in /root/.bashrc
```bash
echo "alias k=kubectl" >> ~/.bashrc && source ~/.bashrc
```

### Task 2 — $do dry-run helper (dry-run=client -o yaml) persisted in /root/.bashrc
```bash
echo "export do=\"--dry-run=client -o yaml\"" >> ~/.bashrc && source ~/.bashrc
```

### Task 3 — $now force-delete helper (--force --grace-period=0) persisted in /root/.bashrc
```bash
echo "export now=\"--force --grace-period=0\"" >> ~/.bashrc && source ~/.bashrc
```

### Task 4 — kn namespace-switch helper persisted in /root/.bashrc
```bash
echo "alias kn='kubectl config set-context --current --namespace'" >> ~/.bashrc && source ~/.bashrc
```

### Task 5 — kubectl bash completion wired for k (__start_kubectl) in /root/.bashrc
```bash
echo 'source <(kubectl completion bash)' >> ~/.bashrc && echo 'complete -o default -F __start_kubectl k' >> ~/.bashrc && source ~/.bashrc
```

### Task 6 — ~/.vimrc has expandtab and tabstop=2
```bash
echo "set expandtab tabstop=2 shiftwidth=2 number autoindent" >> ~/.vimrc
```

### Task 7 — Namespace stage exists
```bash
kubectl create ns stage
```

### Task 8 — Namespace billing exists
```bash
kubectl create ns billing
```

### Task 9 — Namespace stage carries label env=dev
```bash
kubectl label ns stage env=dev
```

### Task 10 — Pod utils runs in stage with busybox:1.36 and a sleep command
```bash
kubectl -n stage run utils --image=busybox:1.36 -- sleep 3600
```

### Task 11 — Pod web-pod runs image nginx:1.27 in stage
```bash
kubectl -n stage run web-pod --image=nginx:1.27
```

### Task 12 — Pod env-demo in stage has env APP_ENV=production
```bash
kubectl -n stage run env-demo --image=nginx:1.27 $do > e.yaml; vim e.yaml  # add env: - name: APP_ENV value: "production"; kubectl apply -f e.yaml
```

### Task 13 — Pod api-pod in stage carries labels app=api and tier=backend
```bash
kubectl -n stage run api-pod --image=nginx:1.27 -l app=api,tier=backend
```

### Task 14 — Pod redis-pod runs redis:7-alpine in billing
```bash
kubectl -n billing run redis-pod --image=redis:7-alpine
```

### Task 15 — Pod res-demo in stage requests cpu=100m memory=128Mi
```bash
kubectl -n stage run res-demo --image=nginx:1.27 $do > r.yaml; vim r.yaml  # add resources.requests; kubectl apply -f r.yaml
```

### Task 16 — Pod res-demo limits cpu=250m memory=256Mi
```bash
kubectl patch pod res-demo -n stage --type=strategic -p ... # Pods cannot be patched with new resources: delete and recreate with limits added
```

### Task 17 — Pod multi in stage has exactly 2 containers (one nginx, one busybox)
```bash
kubectl -n stage run multi --image=nginx:1.27 $do > m.yaml; vim m.yaml  # add second container busybox:1.36; kubectl apply -f m.yaml
```

### Task 18 — Pod anno-pod in stage carries annotation description=week1-drill
```bash
kubectl -n stage annotate pod anno-pod description=week1-drill
```

### Task 19 — Deployment web-dep in stage runs nginx:1.27 with >= 3 replicas
```bash
kubectl -n stage create deploy web-dep --image=nginx:1.27 --replicas=3
```

### Task 20 — Deployment web-dep scaled to exactly 5 replicas
```bash
kubectl -n stage scale deploy web-dep --replicas=5
```

### Task 21 — Deployment canary (seeded at 1.26) updated to nginx:1.27 with revision >= 2
```bash
kubectl -n stage set image deploy/canary nginx=nginx:1.27
```

### Task 22 — Deployment rollback-me shows >= 3 revisions (1.26 -> 1.28 -> undo)
```bash
kubectl -n stage set image deploy/rollback-me nginx=nginx:1.28 && kubectl -n stage rollout undo deploy/rollback-me
```

### Task 23 — rollback-me image is back to nginx:1.26 after the undo
```bash
kubectl -n stage rollout undo deploy/rollback-me  # if not done in task 22
```

### Task 24 — Service web-svc in stage: ClusterIP, port 80, targetPort 80
```bash
kubectl -n stage expose deploy web-dep --port=80 --target-port=80 --name=web-svc
```

### Task 25 — Service web-np in stage is a NodePort on 30080
```bash
kubectl -n stage expose deploy web-dep --port=80 --name=web-np --type=NodePort $do > np.yaml; vim np.yaml  # set nodePort: 30080; kubectl apply -f np.yaml
```

### Task 26 — Service web-svc has at least 1 ready endpoint
```bash
kubectl -n stage get endpoints web-svc  # appears once web-dep pods are Ready
```

### Task 27 — ConfigMap app-cm in stage has data KEY=value
```bash
kubectl -n stage create cm app-cm --from-literal=KEY=value
```

### Task 28 — Secret app-sec in stage carries PASS=s3cr3t
```bash
kubectl -n stage create secret generic app-sec --from-literal=PASS=s3cr3t
```

### Task 29 — /root/secret-value.txt contains the decoded PASS value s3cr3t
```bash
kubectl -n stage get secret app-sec -o jsonpath="{.data.PASS}" | base64 -d > /root/secret-value.txt
```

### Task 30 — ServiceAccount pipeline-sa exists in stage
```bash
kubectl -n stage create sa pipeline-sa
```

### Task 31 — Deployment web-dep carries annotation owner=team-x
```bash
kubectl -n stage annotate deploy web-dep owner=team-x
```

### Task 32 — Job seed-job exists in stage
```bash
kubectl -n stage create job seed-job --image=busybox:1.36 -- echo done
```

### Task 33 — CronJob report-cron in stage runs every 5 minutes
```bash
kubectl -n stage create cronjob report-cron --image=busybox:1.36 --schedule="*/5 * * * *" -- date
```

### Task 34 — Seeded pod doomed (default ns) is deleted
```bash
kubectl delete pod doomed $now
```

### Task 35 — /root/pod.yaml is a Pod manifest using an nginx image
```bash
kubectl run fast --image=nginx:1.27 $do > /root/pod.yaml
```

### Task 36 — /root/dep.yaml is a Deployment manifest with replicas: 3
```bash
kubectl create deploy quick --image=nginx:1.27 --replicas=3 $do > /root/dep.yaml
```

### Task 37 — /root/pod-names.txt lists >= 3 real pod names from stage
```bash
kubectl -n stage get pods -o jsonpath="{.items[*].metadata.name}" | tr " " "\n" > /root/pod-names.txt
```

### Task 38 — Some node carries label env=training
```bash
kubectl label node $(kubectl get nodes -o jsonpath="{.items[0].metadata.name}") env=training
```

### Task 39 — Pod applied-pod runs httpd:2.4 in stage (export, edit, apply)
```bash
kubectl -n stage run applied-pod --image=nginx:1.27 $do > a.yaml; sed -i "s|nginx:1.27|httpd:2.4|" a.yaml; kubectl apply -f a.yaml
```

### Task 40 — /root/events.txt captures cluster events (non-empty)
```bash
kubectl get events -A --sort-by=.metadata.creationTimestamp > /root/events.txt
```
