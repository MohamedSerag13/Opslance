#!/bin/bash
# Week 3 fixtures: crash-looping deployment + a controller-less pod for the drain proof
kubectl create ns ops --dry-run=client -o yaml | kubectl apply -f - >/dev/null
kubectl -n ops get deploy fail-log >/dev/null 2>&1 || kubectl -n ops create deploy fail-log --image=busybox:1.36 --replicas=1 -- sh -c "echo DELIBERATE_FAILURE; exit 1"
kubectl get pod bare-worker >/dev/null 2>&1 || kubectl run bare-worker --image=nginx:1.27 --restart=Never
echo "[fixtures] fail-log (crash-looping) in ns ops + bare-worker in default"
