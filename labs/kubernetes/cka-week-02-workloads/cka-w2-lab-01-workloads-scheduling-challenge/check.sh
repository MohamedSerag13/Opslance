#!/bin/bash
# Checker for: CKA Week 2 Challenge - Workloads and Scheduling
source /opt/ckalib/check_lib.sh
chk_01() { task 10 "upgrade-me updated to nginx:1.27 (revision >= 2)" 'kubectl -n w2 get deploy upgrade-me -o json | jq -e ".spec.template.spec.containers[0].image == \"nginx:1.27\" and (.metadata.annotations[\"deployment.kubernetes.io/revision\"] | tonumber) >= 2"'; }

chk_02() { task 10 "rollback-me back on nginx:1.26 after update to 1.28 + undo (revision >= 3)" 'kubectl -n w2 get deploy rollback-me -o json | jq -e ".spec.template.spec.containers[0].image == \"nginx:1.26\" and (.metadata.annotations[\"deployment.kubernetes.io/revision\"] | tonumber) >= 3"'; }

chk_03() { task 10 "upgrade-me strategy: maxUnavailable=0, maxSurge=1 (no-downtime rolling update)" 'kubectl -n w2 get deploy upgrade-me -o json | jq -e ".spec.strategy.rollingUpdate.maxUnavailable == 0 and .spec.strategy.rollingUpdate.maxSurge == 1"'; }

chk_04() { task 10 "HPA web-hpa on upgrade-me: min 2, max 6, CPU target 70%" 'kubectl -n w2 get hpa web-hpa -o json | jq -e ".spec.minReplicas == 2 and .spec.maxReplicas == 6 and .spec.targetCPUUtilizationPercentage == 70"'; }

chk_05() { task 10 "ConfigMap w2-config (MODE=fast) consumed as env by pod cm-env via envFrom" 'kubectl -n w2 get cm w2-config -o json | jq -e ".data.MODE == \"fast\"" && kubectl -n w2 get pod cm-env -o json | jq -e "any(.spec.containers[0].envFrom // []; .configMapRef.name == \"w2-config\")"'; }

chk_06() { task 10 "Secret w2-secret mounted at /etc/creds in pod sec-mount" 'kubectl -n w2 get secret w2-secret -o name && kubectl -n w2 get pod sec-mount -o json | jq -e "[.spec.volumes[]? | select(.secret.secretName == \"w2-secret\")] | length == 1 and any(.spec.containers[0].volumeMounts // []; .mountPath == \"/etc/creds\")"'; }

chk_07() { task 10 "Pod bootstrapper: init container writes index.html into emptyDir served by nginx" 'kubectl -n w2 get pod bootstrapper -o json | jq -e ".spec.initContainers | length >= 1 and any(.spec.volumes[]?; .emptyDir != null) and any(.spec.initContainers[].volumeMounts // []; .mountPath == \"/web-data\") and any(.spec.containers[].volumeMounts // []; .mountPath == \"/usr/share/nginx/html\")"'; }

chk_08() { task 10 "Pod logger: busybox sidecar shares an emptyDir at /logs with the main container" 'kubectl -n w2 get pod logger -o json | jq -e ".spec.containers | length == 2 and any(.spec.containers[]; .image | test(\"busybox\")) and any(.spec.volumes[]?; .emptyDir != null) and ([.spec.containers[].volumeMounts[]?.name] | length >= 2)"'; }

chk_09() { task 10 "Job batch-job: completions 3, parallelism 2, backoffLimit 4" 'kubectl -n w2 get job batch-job -o json | jq -e ".spec.completions == 3 and .spec.parallelism == 2 and .spec.backoffLimit == 4"'; }

chk_10() { task 10 "CronJob nightly: schedule 30 2 * * *, not suspended" 'kubectl -n w2 get cronjob nightly -o json | jq -e ".spec.schedule == \"30 2 * * *\" and .spec.suspend == false"'; }

chk_11() { task 10 "Node labeled disk=fast and pod pin-node lands there via nodeSelector" 'kubectl get nodes -o json | jq -e "[.items[] | select(.metadata.labels.disk == \"fast\")] | length >= 1" && kubectl -n w2 get pod pin-node -o json | jq -e ".spec.nodeSelector.disk == \"fast\" and .status.phase == \"Running\""'; }

chk_12() { task 10 "Node tainted dedicated=cka:NoSchedule; pod tol-pod tolerates it and still runs" 'kubectl get nodes -o json | jq -e "[.items[].spec.taints[]?] | map(select(.key == \"dedicated\" and .value == \"cka\" and .effect == \"NoSchedule\")) | length >= 1" && kubectl -n w2 get pod tol-pod -o json | jq -e "any(.spec.tolerations // []; .key == \"dedicated\" and .operator == \"Equal\" and .value == \"cka\" and .effect == \"NoSchedule\") and .status.phase == \"Running\""'; }

# Single-task mode: `bash /check.sh <n>` validates only task <n> and prints
# exactly one PASS/FAIL line — used by the question runner per-question checks.
if [ $# -gt 0 ]; then
  fn="chk_$(printf '%02d' "$1" 2>/dev/null)"
  if declare -f "$fn" >/dev/null 2>&1; then "$fn"; else
    echo "  FAIL [    0] unknown task index '$1'"; fi
  exit 0
fi

# Full check: every task, in order.
echo "=== CKA Week 2 Challenge - Workloads and Scheduling ==="
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
