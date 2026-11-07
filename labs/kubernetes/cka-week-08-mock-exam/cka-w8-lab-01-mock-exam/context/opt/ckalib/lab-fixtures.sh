#!/bin/bash
# Week 8 fixtures: exam seeds (legacy deployment, broken fixme, etcd helper, netpol targets, controller)
set -e
kubectl create ns exam --dry-run=client -o yaml | kubectl apply -f - >/dev/null
kubectl -n exam get deploy legacy-app >/dev/null 2>&1 || kubectl -n exam create deploy legacy-app --image=nginx:1.26 --replicas=4
kubectl -n exam get deploy fixme >/dev/null 2>&1 || { kubectl -n exam create deploy fixme --image=nginx:1.27-nope --replicas=0; }
kubectl -n exam get deploy protected >/dev/null 2>&1 || kubectl -n exam create deploy protected --image=nginx:1.27 --replicas=1
kubectl -n exam label deploy protected app=protected --overwrite
kubectl -n exam get deploy client >/dev/null 2>&1 || kubectl -n exam create deploy client --image=busybox:1.36 --replicas=1 -- sleep 3600
if ! kubectl -n kube-system get pod etcd-helper >/dev/null 2>&1; then
cat <<'YAML' | kubectl apply -f - >/dev/null
apiVersion: v1
kind: Pod
metadata:
  name: etcd-helper
  namespace: kube-system
spec:
  hostNetwork: true
  restartPolicy: Always
  containers:
  - name: helper
    image: rancher/k3s:v1.31.2-k3s1
    command: ["sleep","3600"]
    volumeMounts:
    - name: tls
      mountPath: /tls
    - name: snaps
      mountPath: /snapshots
  volumes:
  - name: tls
    hostPath:
      path: /var/lib/rancher/k3s/server/tls
  - name: snaps
    hostPath:
      path: /var/lib/rancher/k3s/server/db/snapshots
      type: DirectoryOrCreate
YAML
fi
if ! kubectl get ns ingress-nginx >/dev/null 2>&1; then
  kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.2/deploy/static/provider/baremetal/deploy.yaml >/dev/null 2>&1 || echo "[fixtures] WARNING: ingress-nginx install failed"
fi
echo "[fixtures] exam seeds ready (legacy-app @1.26, fixme broken, etcd-helper, protected+client, ingress controller)"
