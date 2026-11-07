#!/bin/bash
# Week 1 fixtures: a pod the student must delete (task 34)
kubectl get pod doomed >/dev/null 2>&1 || kubectl run doomed --image=nginx:1.27 --restart=Never
echo "[fixtures] seeded pod 'doomed' in default namespace"
