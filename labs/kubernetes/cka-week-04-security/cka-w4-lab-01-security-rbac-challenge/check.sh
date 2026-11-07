#!/bin/bash
# Checker for: CKA Week 4 Challenge - RBAC, Certificates, Security Contexts
source /opt/ckalib/check_lib.sh
chk_01() { task 10 "ServiceAccount dev-sa exists in ns dev" 'kubectl -n dev get sa dev-sa -o name'; }

chk_02() { task 10 "Role pods-reader in dev allows get,list,watch on pods" 'kubectl -n dev get role pods-reader -o json | jq -e "[.rules[] | select((.resources // []) | index(\"pods\")) | .verbs[]] as $v | ([\"get\",\"list\",\"watch\"] - $v) | length == 0"'; }

chk_03() { task 10 "RoleBinding pods-reader-binding binds pods-reader to SA dev:dev-sa" 'kubectl -n dev get rolebinding pods-reader-binding -o json | jq -e ".roleRef.name == \"pods-reader\" and [.subjects[] | select(.kind == \"ServiceAccount\" and .name == \"dev-sa\")] | length == 1"'; }

chk_04() { task 10 "auth can-i: the SA CAN list pods in dev" 'kubectl -n dev auth can-i list pods --as=system:serviceaccount:dev:dev-sa | grep -qx yes'; }

chk_05() { task 10 "auth can-i: the SA CANNOT delete pods in dev (least privilege)" 'kubectl -n dev auth can-i delete pods --as=system:serviceaccount:dev:dev-sa | grep -qx no'; }

chk_06() { task 10 "ClusterRole node-reader allows get,list,watch on nodes" 'kubectl get clusterrole node-reader -o json | jq -e "[.rules[] | select((.resources // []) | index(\"nodes\")) | .verbs[]] as $v | ([\"get\",\"list\",\"watch\"] - $v) | length == 0"'; }

chk_07() { task 10 "ClusterRoleBinding grants node-reader to dev-sa; can-i get nodes -> yes" 'kubectl get clusterrolebinding node-reader-binding -o json | jq -e ".roleRef.name == \"node-reader\" and [.subjects[] | select(.kind == \"ServiceAccount\" and .name == \"dev-sa\")] | length == 1" && kubectl auth can-i get nodes --as=system:serviceaccount:dev:dev-sa | grep -qx yes'; }

chk_08() { task 10 "CSR jane-csr Approved with certificate issued" 'kubectl get csr jane-csr -o json | jq -e ".status.certificate != null and any(.status.conditions[]?; .type == \"Approved\")"'; }

chk_09() { task 10 "/home/intern/jane.kubeconfig authenticates jane (can-i prints no)" '[ -s /home/intern/jane.kubeconfig ] && kubectl --kubeconfig /home/intern/jane.kubeconfig auth can-i list pods 2>/dev/null | grep -qx no'; }

chk_10() { task 10 "Pod sc-pod runs as non-root (runAsNonRoot=true, runAsUser=1000)" 'kubectl -n dev get pod sc-pod -o json | jq -e ".spec.securityContext.runAsNonRoot == true and .spec.securityContext.runAsUser == 1000"'; }

chk_11() { task 10 "Pod sc-pod drops ALL capabilities and adds NET_BIND_SERVICE" 'kubectl -n dev get pod sc-pod -o json | jq -e ".spec.containers[0].securityContext.capabilities.drop | index(\"ALL\") != null and (.spec.containers[0].securityContext.capabilities.add | index(\"NET_BIND_SERVICE\")) != null"'; }

chk_12() { task 10 "ns secure enforces PSA baseline; a hostPath pod is rejected there" 'kubectl get ns secure -o json | jq -e ".metadata.labels[\"pod-security.kubernetes.io/enforce\"] == \"baseline\"" && ! (printf "apiVersion: v1\nkind: Pod\nmetadata:\n  name: unsafe\n  namespace: secure\nspec:\n  containers:\n  - name: c\n    image: busybox:1.36\n    volumeMounts:\n    - name: h\n      mountPath: /host\n  volumes:\n  - name: h\n    hostPath:\n      path: /etc\n" | kubectl apply -f - 2>/dev/null)'; }

# Single-task mode: `bash /check.sh <n>` validates only task <n> and prints
# exactly one PASS/FAIL line — used by the question runner per-question checks.
if [ $# -gt 0 ]; then
  fn="chk_$(printf '%02d' "$1" 2>/dev/null)"
  if declare -f "$fn" >/dev/null 2>&1; then "$fn"; else
    echo "  FAIL [    0] unknown task index '$1'"; fi
  exit 0
fi

# Full check: every task, in order.
echo "=== CKA Week 4 Challenge - RBAC, Certificates, Security Contexts ==="
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
