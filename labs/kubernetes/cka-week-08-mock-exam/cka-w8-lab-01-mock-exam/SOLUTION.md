# CKA Week 8 Mock Exam - 18 Questions, 120 Minutes — Solution

### Task 1 — Namespace exam created and set as the current-context namespace
```bash
kubectl create ns exam; kubectl config set-context --current --namespace=exam
```

### Task 2 — Pod fast runs nginx:1.27 in exam and is Running
```bash
kubectl -n exam run fast --image=nginx:1.27
```

### Task 3 — Deployment api: 4 replicas of nginx:1.27, all Ready
```bash
kubectl -n exam create deploy api --image=nginx:1.27 --replicas=4
```

### Task 4 — legacy-app updated to nginx:1.27 (revision >= 2)
```bash
kubectl -n exam set image deploy/legacy-app nginx=nginx:1.27
```

### Task 5 — ConfigMap exam-cm (KEY1=val1) and Secret exam-sec (PASS=topsecret) in exam
```bash
kubectl -n exam create cm exam-cm --from-literal=KEY1=val1; kubectl -n exam create secret generic exam-sec --from-literal=PASS=topsecret
```

### Task 6 — CronJob backup-cron runs daily at 01:00 (0 1 * * *)
```bash
kubectl -n exam create cronjob backup-cron --image=busybox:1.36 --schedule="0 1 * * *" -- date
```

### Task 7 — Service api-svc (80) exposes deploy api with ready endpoints
```bash
kubectl -n exam expose deploy api --port=80 --name=api-svc
```

### Task 8 — Node tainted exam=drain:NoSchedule; pod tol-pod tolerates it and runs
```bash
kubectl taint nodes $(kubectl get nodes -o jsonpath="{.items[0].metadata.name}") exam=drain:NoSchedule; kubectl -n exam run tol-pod --image=nginx:1.27 $do > t.yaml  # add toleration; apply
```

### Task 9 — RBAC: SA deployer + Role deployer-role (create deployments) + RoleBinding in exam
```bash
kubectl -n exam create sa deployer; kubectl -n exam create role deployer-role --verb=create --resource=deployments; kubectl -n exam create rolebinding deployer-binding --role=deployer-role --serviceaccount=exam:deployer
```

### Task 10 — auth can-i: deployer SA CAN create deployments in exam
```bash
kubectl -n exam auth can-i create deployments --as=system:serviceaccount:exam:deployer  # must print yes
```

### Task 11 — NetworkPolicy in exam: client cannot reach protected, DNS still works
```bash
# default-deny ingress on app=protected + an egress rule for DNS (UDP/TCP 53) - the week 5 pattern
```

### Task 12 — Storage: PVC exam-pvc (1Gi, local-path) Bound and mounted in pod pvc-pod
```bash
kubectl -n exam apply -f - <<EOF  # PVC 1Gi storageClassName local-path; pod pvc-pod nginx mounting it
```

### Task 13 — etcd backup: snapshot copied to /root/exam-snap.db and verified
```bash
kubectl -n kube-system exec etcd-helper -- sh -c "ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 --cacert /tls/etcd/ca.crt --cert /tls/etcd/client.crt --key /tls/etcd/client.key snapshot save /snapshots/backup.db" && kubectl -n kube-system exec etcd-helper -- cat /snapshots/backup.db > /root/exam-snap.db
```

### Task 14 — Helm release exam-rel installed in exam with replicaCount 2
```bash
helm -n exam install exam-rel /root/chart --set replicaCount=2
```

### Task 15 — Kustomize overlay applied: kust-web at 2 replicas on nginx:1.28 in exam
```bash
mkdir -p /root/kustomize/overlays/prod; printf "apiVersion: kustomize.config.k8s.io/v1beta1\nkind: Kustomization\nresources:\n- ../../base\nnamespace: exam\npatches:\n- path: patch.yaml\nimages:\n- name: nginx\n  newTag: 1.28\n" > /root/kustomize/overlays/prod/kustomization.yaml; printf "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: kust-web\nspec:\n  replicas: 2\n" > /root/kustomize/overlays/prod/patch.yaml; kubectl apply -k /root/kustomize/overlays/prod
```

### Task 16 — Ingress exam-ing: exam.example.com -> api-svc verified with curl
```bash
kubectl -n exam create ingress exam-ing --rule="exam.example.com/*=api-svc:80"; curl -s -H "Host: exam.example.com" "http://k3s-server:$(kubectl -n ingress-nginx get svc ingress-nginx-controller -o jsonpath='{.spec.ports[?(@.port==80)].nodePort}')/"
```

### Task 17 — fixme repaired: 2 replicas of nginx:1.27 all Ready (was 0 replicas, broken image)
```bash
kubectl -n exam set image deploy/fixme nginx=nginx:1.27; kubectl -n exam scale deploy fixme --replicas=2
```

### Task 18 — /root/pod-ips.txt contains the live IP of pod fast
```bash
kubectl -n exam get pod fast -o jsonpath="{.status.podIP}" > /root/pod-ips.txt
```
