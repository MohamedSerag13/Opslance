# CKA Week 3 Challenge - Maintenance, etcd, Logging — Solution

### Task 1 — Drain (--ignore-daemonsets --delete-emptydir-data) then uncordon: bare-worker evicted, node schedulable
```bash
N=$(kubectl get nodes -o jsonpath="{.items[0].metadata.name}"); kubectl drain $N --ignore-daemonsets --delete-emptydir-data; kubectl uncordon $N  # bare-worker has no controller so it never comes back
```

### Task 2 — etcd-helper pod Running in kube-system (k3s image, hostNetwork, /tls + /snapshots hostPaths)
```bash
kubectl -n kube-system run etcd-helper --image=rancher/k3s:v1.31.2-k3s1 --restart=Never $do > h.yaml; vim h.yaml  # hostNetwork: true; hostPaths /var/lib/rancher/k3s/server/tls -> /tls and /var/lib/rancher/k3s/server/db/snapshots -> /snapshots (DirectoryOrCreate); command: sleep 3600; apply
```

### Task 3 — etcd snapshot saved via helper and copied to /root/etcd-backup.db (valid snapshot file)
```bash
kubectl -n kube-system exec etcd-helper -- sh -c "ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 --cacert /tls/etcd/ca.crt --cert /tls/etcd/client.crt --key /tls/etcd/client.key snapshot save /snapshots/backup.db" && kubectl -n kube-system exec etcd-helper -- cat /snapshots/backup.db > /root/etcd-backup.db
```

### Task 4 — /root/snapshot-status.txt captures the snapshot status table (DB size present)
```bash
ETCDCTL_API=3 etcdctl snapshot status /root/etcd-backup.db --write-table > /root/snapshot-status.txt
```

### Task 5 — /root/backup-manifest.txt contains the snapshot sha256
```bash
sha256sum /root/etcd-backup.db > /root/backup-manifest.txt
```

### Task 6 — Restore drilled: etcdutl restore produced /snapshots/restored/member inside the helper
```bash
kubectl -n kube-system exec etcd-helper -- sh -c "ETCDCTL_API=3 etcdutl snapshot restore /snapshots/backup.db --data-dir /snapshots/restored"  # this is the exam restore: then repoint --data-dir in the etcd manifest
```

### Task 7 — /root/crash.log captures logs --previous of the crash-looping fail-log deployment
```bash
P=$(kubectl -n ops get pods -l app=fail-log -o jsonpath="{.items[0].metadata.name}"); kubectl -n ops logs $P --previous > /root/crash.log
```

### Task 8 — /root/top-pods.txt has live metrics-server output for all pods
```bash
kubectl top pods -A > /root/top-pods.txt
```

### Task 9 — /root/events-ops.txt shows events mentioning fail-log
```bash
kubectl -n ops get events --sort-by=.metadata.creationTimestamp > /root/events-ops.txt
```

### Task 10 — /root/static-manifests.txt lists the k3s static pod manifests (coredns visible)
```bash
ls /k3s-manifests > /root/static-manifests.txt  # this is the kubelet staticPodPath equivalent: /var/lib/rancher/k3s/server/manifests
```

### Task 11 — /root/node-describe.txt is a node describe output containing Conditions
```bash
kubectl describe node $(kubectl get nodes -o jsonpath="{.items[0].metadata.name}") > /root/node-describe.txt
```

### Task 12 — etcd endpoint health verified through the helper
```bash
kubectl -n kube-system exec etcd-helper -- sh -c "ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 --cacert /tls/etcd/ca.crt --cert /tls/etcd/client.crt --key /tls/etcd/client.key endpoint health" | tee /root/etcd-endpoints.txt
```
