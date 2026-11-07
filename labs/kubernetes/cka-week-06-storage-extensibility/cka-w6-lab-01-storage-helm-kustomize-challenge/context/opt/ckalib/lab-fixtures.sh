#!/bin/bash
# Week 6 fixtures: namespace + a deliberately stuck PVC
kubectl create ns w6 --dry-run=client -o yaml | kubectl apply -f - >/dev/null
if ! kubectl -n w6 get pvc pending-pvc >/dev/null 2>&1; then
  printf "apiVersion: v1\nkind: PersistentVolumeClaim\nmetadata:\n  name: pending-pvc\n  namespace: w6\nspec:\n  accessModes:\n  - ReadWriteOnce\n  resources:\n    requests:\n      storage: 500Mi\n  storageClassName: no-such-class\n" | kubectl apply -f - >/dev/null
fi
echo "[fixtures] pending-pvc seeded (stuck on no-such-class)"
