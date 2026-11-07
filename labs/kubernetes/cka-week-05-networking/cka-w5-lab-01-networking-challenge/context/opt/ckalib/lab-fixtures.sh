#!/bin/bash
# Week 5 fixtures: workloads, ingress-nginx controller, Gateway API CRDs
kubectl create ns apps --dry-run=client -o yaml | kubectl apply -f - >/dev/null
kubectl create ns secure --dry-run=client -o yaml | kubectl apply -f - >/dev/null
kubectl -n apps get deploy web-a >/dev/null 2>&1 || kubectl -n apps create deploy web-a --image=nginx:1.27 --replicas=2
kubectl -n apps label deploy web-a app=web-a --overwrite
kubectl -n apps get deploy web-b >/dev/null 2>&1 || kubectl -n apps create deploy web-b --image=httpd:2.4 --replicas=1
kubectl -n apps label deploy web-b app=web-b --overwrite
kubectl -n secure get deploy protected >/dev/null 2>&1 || kubectl -n secure create deploy protected --image=nginx:1.27 --replicas=1
kubectl -n secure label deploy protected app=protected --overwrite
kubectl -n secure get deploy client >/dev/null 2>&1 || kubectl -n secure create deploy client --image=busybox:1.36 --replicas=1 -- sleep 3600
kubectl -n secure get deploy client2 >/dev/null 2>&1 || kubectl -n secure create deploy client2 --image=busybox:1.36 --replicas=1 -- sleep 3600
kubectl -n secure label deploy client2 access=allowed --overwrite
if ! kubectl get ns ingress-nginx >/dev/null 2>&1; then
  echo "[fixtures] installing ingress-nginx (baremetal/NodePort)..."
  kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.2/deploy/static/provider/baremetal/deploy.yaml >/dev/null 2>&1 || echo "[fixtures] WARNING: ingress-nginx install failed"
fi
if ! kubectl get gatewayclass cka-gc >/dev/null 2>&1; then
  echo "[fixtures] installing Gateway API CRDs..."
  kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/standard-install.yaml >/dev/null 2>&1 || echo "[fixtures] WARNING: gateway-api install failed"
  printf "apiVersion: gateway.networking.k8s.io/v1\nkind: GatewayClass\nmetadata:\n  name: cka-gc\nspec:\n  controllerName: example.com/cka-gateway\n" | kubectl apply -f - >/dev/null 2>&1
fi
echo "[fixtures] week 5 environment ready"
