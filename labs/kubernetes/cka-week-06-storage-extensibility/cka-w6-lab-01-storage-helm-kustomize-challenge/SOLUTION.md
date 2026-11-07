# CKA Week 6 Challenge - Storage, Helm, Kustomize, CRDs — Solution

### Task 1 — PV manual-pv: 1Gi, RWO, hostPath /mnt/data
```bash
kubectl apply -f - <<EOF  # apiVersion v1, kind PersistentVolume, capacity storage 1Gi, accessModes [ReadWriteOnce], hostPath /mnt/data, storageClassName: manual
```

### Task 2 — PVC manual-pvc is Bound to manual-pv
```bash
kubectl apply -f - <<EOF  # PVC: storage 1Gi, accessModes [ReadWriteOnce], storageClassName: manual (must match the PV)
```

### Task 3 — Pod pvc-user mounts manual-pvc at /usr/share/nginx/html and runs
```bash
kubectl -n w6 run pvc-user --image=nginx:1.27 $do > p.yaml; vim p.yaml  # volume: {persistentVolumeClaim: {claimName: manual-pvc}} + mount; apply
```

### Task 4 — Dynamic PVC dyn-pvc (1Gi, storageClassName local-path) is Bound
```bash
kubectl -n w6 apply -f - <<EOF  # PVC 1Gi storageClassName: local-path (k3s default provisioner)
```

### Task 5 — Rescue: seeded pending-pvc (bad StorageClass) is now Bound
```bash
kubectl -n w6 patch pvc pending-pvc -p '{"spec":{"storageClassName":"local-path"}}'  # patching storageClassName on a pending PVC works
```

### Task 6 — StorageClass fast: local-path provisioner, Retain, allowVolumeExpansion
```bash
kubectl apply -f - <<EOF  # StorageClass fast, provisioner rancher.io/local-path, reclaimPolicy Retain, allowVolumeExpansion: true, volumeBindingMode: WaitForFirstConsumer
```

### Task 7 — Helm release webapp installed in w6 with replicaCount 2
```bash
helm -n w6 install webapp /root/webchart --set replicaCount=2
```

### Task 8 — Helm upgrade pins image.tag=1.28
```bash
helm -n w6 upgrade webapp /root/webchart --set image.tag=1.28
```

### Task 9 — Helm rollback executed (history shows a Rollback entry)
```bash
helm -n w6 rollback webapp 1  # then helm history webapp shows the rollback revision
```

### Task 10 — helm template output saved to /root/chart-render.yaml (Deployment + ConfigMap)
```bash
helm template webapp /root/webchart > /root/chart-render.yaml
```

### Task 11 — Kustomize overlay prod applied: cka-web at 3 replicas on nginx:1.28
```bash
mkdir -p /root/kustomize/overlays/prod; cat > .../kustomization.yaml <<EOF  # resources: [../../base], patches replicas 3, images newTag 1.28, namespace w6; EOF; kubectl apply -k /root/kustomize/overlays/prod
```

### Task 12 — CRD databases.example.com Established + CR my-db with spec.size=small
```bash
kubectl apply -f - <<EOF  # apiextensions.k8s.io/v1 CRD databases.example.com scope Namespaced, names {plural: databases, singular: database, kind: Database}, versions v1 schema; EOF; kubectl -n w6 apply -f - <<EOF  # kind: Database, spec.size: small
```
