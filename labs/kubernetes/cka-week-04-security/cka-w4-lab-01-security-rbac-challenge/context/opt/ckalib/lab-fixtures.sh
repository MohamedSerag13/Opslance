#!/bin/bash
# Week 4 fixtures: two namespaces, secure starts unlabeled on purpose
kubectl create ns dev --dry-run=client -o yaml | kubectl apply -f - >/dev/null
kubectl create ns secure --dry-run=client -o yaml | kubectl apply -f - >/dev/null
echo "[fixtures] ns dev + ns secure (unlabeled) ready"
