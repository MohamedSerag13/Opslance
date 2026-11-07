#!/bin/bash
# Waits for the k3s API, installs the kubeconfig, applies lab fixtures,
# then hands over the shell. The websocket terminal execs its own bash, so
# KUBECONFIG comes from the image ENV and is always valid once /kube/config
# has been written.
set -u
echo "[cka-lab] Waiting for the k3s cluster API (first boot pulls images: 1-3 min)..."
ok=0
for i in $(seq 1 120); do
  if [ -s /output/k3s.yaml ]; then
    mkdir -p /kube
    sed "s|127.0.0.1|${K3S_SERVER:-k3s-server}|g" /output/k3s.yaml > /kube/config
    chmod 644 /kube/config
    if kubectl get --raw=/readyz >/dev/null 2>&1; then
      ok=1
      break
    fi
  fi
  printf '.'
  sleep 3
done
echo ""
if [ "$ok" = "1" ]; then
  echo "[cka-lab] Cluster ready. Kubeconfig: $KUBECONFIG"
else
  echo "[cka-lab] WARNING: cluster not ready after 6 minutes. Last API error:"
  kubectl get --raw=/readyz 2>&1 | tail -2 || true
  echo "[cka-lab] Inspect: ls -la /output/ ; kubectl config view ; the k3s-server container logs"
fi
if [ -f /opt/ckalib/lab-fixtures.sh ]; then
  echo "[cka-lab] Preparing lab fixtures..."
  bash /opt/ckalib/lab-fixtures.sh || echo "[cka-lab] WARNING: fixture setup reported errors."
fi
exec /bin/bash
