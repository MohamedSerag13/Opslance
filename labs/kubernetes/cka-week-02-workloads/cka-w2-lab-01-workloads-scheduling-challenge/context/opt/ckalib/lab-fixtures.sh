#!/bin/bash
# Week 2 fixtures: two deployments to practice update + rollback
kubectl create ns w2 --dry-run=client -o yaml | kubectl apply -f - >/dev/null
kubectl -n w2 get deploy upgrade-me >/dev/null 2>&1 || kubectl -n w2 create deploy upgrade-me --image=nginx:1.26 --replicas=2
kubectl -n w2 get deploy rollback-me >/dev/null 2>&1 || kubectl -n w2 create deploy rollback-me --image=nginx:1.26 --replicas=2
echo "[fixtures] upgrade-me + rollback-me seeded at nginx:1.26 in ns w2"
