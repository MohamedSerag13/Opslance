#!/bin/bash
# Checker for: CKA Week 6 Challenge - Storage, Helm, Kustomize, CRDs
source /opt/ckalib/check_lib.sh
chk_01() { task 10 "PV manual-pv: 1Gi, RWO, hostPath /mnt/data" 'kubectl get pv manual-pv -o json | jq -e ".spec.capacity.storage == \"1Gi\" and (.spec.accessModes | index(\"ReadWriteOnce\") != null) and .spec.hostPath.path == \"/mnt/data\""'; }

chk_02() { task 10 "PVC manual-pvc is Bound to manual-pv" 'kubectl -n w6 get pvc manual-pvc -o json | jq -e ".status.phase == \"Bound\" and .spec.volumeName == \"manual-pv\""'; }

chk_03() { task 10 "Pod pvc-user mounts manual-pvc at /usr/share/nginx/html and runs" 'kubectl -n w6 get pod pvc-user -o json | jq -e "any(.spec.volumes[]?; .persistentVolumeClaim.claimName == \"manual-pvc\") and .status.phase == \"Running\""'; }

chk_04() { task 10 "Dynamic PVC dyn-pvc (1Gi, storageClassName local-path) is Bound" 'kubectl -n w6 get pvc dyn-pvc -o json | jq -e ".status.phase == \"Bound\" and .spec.storageClassName == \"local-path\""'; }

chk_05() { task 10 "Rescue: seeded pending-pvc (bad StorageClass) is now Bound" 'kubectl -n w6 get pvc pending-pvc -o json | jq -e ".status.phase == \"Bound\""'; }

chk_06() { task 10 "StorageClass fast: local-path provisioner, Retain, allowVolumeExpansion" 'kubectl get sc fast -o json | jq -e ".provisioner == \"rancher.io/local-path\" and .reclaimPolicy == \"Retain\" and .allowVolumeExpansion == true"'; }

chk_07() { task 10 "Helm release webapp installed in w6 with replicaCount 2" 'helm -n w6 list -o json | jq -e ".[] | select(.name == \"webapp\" and .status == \"deployed\")" && kubectl -n w6 get deploy -o json | jq -e "[.items[] | select(.spec.replicas == 2)] | length >= 1"'; }

chk_08() { task 10 "Helm upgrade pins image.tag=1.28" 'helm -n w6 get values webapp | grep -q "1.28"'; }

chk_09() { task 10 "Helm rollback executed (history shows a Rollback entry)" 'helm -n w6 history webapp | grep -qi rollback'; }

chk_10() { task 10 "helm template output saved to /root/chart-render.yaml (Deployment + ConfigMap)" 'grep -q "kind: Deployment" /root/chart-render.yaml && grep -q "kind: ConfigMap" /root/chart-render.yaml'; }

chk_11() { task 10 "Kustomize overlay prod applied: cka-web at 3 replicas on nginx:1.28" 'kubectl -n w6 get deploy cka-web -o json | jq -e ".spec.replicas == 3 and .spec.template.spec.containers[0].image == \"nginx:1.28\""'; }

chk_12() { task 10 "CRD databases.example.com Established + CR my-db with spec.size=small" 'kubectl get crd databases.example.com -o json | jq -e "[.status.conditions[] | select(.type == \"Established\")] | length >= 1" && kubectl get databases.example.com my-db -o json | jq -e ".spec.size == \"small\""'; }

# Single-task mode: `bash /check.sh <n>` validates only task <n> and prints
# exactly one PASS/FAIL line — used by the question runner per-question checks.
if [ $# -gt 0 ]; then
  fn="chk_$(printf '%02d' "$1" 2>/dev/null)"
  if declare -f "$fn" >/dev/null 2>&1; then "$fn"; else
    echo "  FAIL [    0] unknown task index '$1'"; fi
  exit 0
fi

# Full check: every task, in order.
echo "=== CKA Week 6 Challenge - Storage, Helm, Kustomize, CRDs ==="
echo "Tasks: 12 | Pass mark: 66% (CKA exam pass mark)"
echo "State your objects as the tasks ask. Per-question checks in the runner validate one task at a time; Finish/Submit runs this full check."
echo ""
chk_01
chk_02
chk_03
chk_04
chk_05
chk_06
chk_07
chk_08
chk_09
chk_10
chk_11
chk_12
finish 66
