#!/bin/bash
# Checker for: CKA Week 7 Challenge - Fix the Broken Cluster (14 Scenarios)
source /opt/ckalib/check_lib.sh
chk_01() { task 10 "ipull: wrong image fixed to nginx:1.27 and pods Ready" 'kubectl -n broken get deploy ipull -o json | jq -e ".spec.template.spec.containers[0].image == \"nginx:1.27\"" && kubectl -n broken get deploy ipull -o json | jq -e ".status.readyReplicas >= 1"'; }

chk_02() { task 10 "crashy: container command fixed to sleep (pods Ready, no more CrashLoopBackOff)" 'kubectl -n broken get deploy crashy -o json | jq -e ".spec.template.spec.containers[0].image | test(\"busybox\") and (((.spec.template.spec.containers[0].command // []) + (.spec.template.spec.containers[0].args // [])) | index(\"sleep\") != null)" && kubectl -n broken get deploy crashy -o json | jq -e ".status.readyReplicas >= 1"'; }

chk_03() { task 10 "huge: impossible cpu request fixed to 100m and pods Ready" 'kubectl -n broken get deploy huge -o json | jq -e ".spec.template.spec.containers[0].resources.requests.cpu == \"100m\"" && kubectl -n broken get deploy huge -o json | jq -e ".status.readyReplicas >= 1"'; }

chk_04() { task 10 "zero-dep: scaled to 3 with 3 replicas Ready" 'kubectl -n broken get deploy zero-dep -o json | jq -e ".spec.replicas == 3 and .status.readyReplicas == 3"'; }

chk_05() { task 10 "broken-svc: targetPort corrected to 80; tester reaches the Service" 'kubectl -n broken get svc broken-svc -o json | jq -e ".spec.ports[0].targetPort == 80" && kubectl -n broken exec deploy/tester -- wget -qO- -T 3 http://broken-svc | grep -qi nginx'; }

chk_06() { task 10 "no-ep-svc: selector corrected to app=web; Service has endpoints" 'kubectl -n broken get endpoints no-ep-svc -o json | jq -e "[.subsets[]?.addresses[]?] | length > 0"'; }

chk_07() { task 10 "oom: memory limit raised to 128Mi; pod Running (was OOMKilled)" 'kubectl -n broken get pod oom -o json | jq -e ".spec.containers[0].resources.limits.memory == \"128Mi\" and .status.phase == \"Running\""'; }

chk_08() { task 10 "env-app: missing GREETING=hello env added; pod Running" 'kubectl -n broken get pod env-app -o json | jq -e "any(.spec.containers[0].env // []; .name == \"GREETING\" and .value == \"hello\") and .status.phase == \"Running\""'; }

chk_09() { task 10 "stuck-sc: PVC rescued from a missing StorageClass and now Bound" 'kubectl -n broken get pvc stuck-sc -o json | jq -e ".status.phase == \"Bound\""'; }

chk_10() { task 10 "bad-job: fixed so it completes (status.succeeded >= 1)" 'kubectl -n broken get job bad-job -o json | jq -e ".status.succeeded >= 1"'; }

chk_11() { task 10 "sec-reader: reads /creds/password (secret key mapping fixed); pod Running" 'kubectl -n broken get pod sec-reader -o json | jq -e ".status.phase == \"Running\"" && kubectl -n broken exec sec-reader -- cat /creds/password | grep -qx s3cr3t'; }

chk_12() { task 10 "broken-ing: backend Service corrected; curl with Host header serves nginx" 'NP=$(kubectl -n ingress-nginx get svc ingress-nginx-controller -o jsonpath="{.spec.ports[?(@.port==80)].nodePort}"); curl -s -H "Host: broken.example.com" "http://k3s-server:${NP}/" | grep -qi nginx'; }

chk_13() { task 10 "netpol-block: policy removed/relaxed; tester reaches web-svc again" 'kubectl -n broken exec deploy/tester -- wget -qO- -T 3 http://web-svc | grep -qi nginx'; }

chk_14() { task 10 "/root/diagnosis.md documents the root causes (mentions ImagePullBackOff)" '[ -s /root/diagnosis.md ] && grep -qi imagepull /root/diagnosis.md'; }

# Single-task mode: `bash /check.sh <n>` validates only task <n> and prints
# exactly one PASS/FAIL line — used by the question runner per-question checks.
if [ $# -gt 0 ]; then
  fn="chk_$(printf '%02d' "$1" 2>/dev/null)"
  if declare -f "$fn" >/dev/null 2>&1; then "$fn"; else
    echo "  FAIL [    0] unknown task index '$1'"; fi
  exit 0
fi

# Full check: every task, in order.
echo "=== CKA Week 7 Challenge - Fix the Broken Cluster (14 Scenarios) ==="
echo "Tasks: 14 | Pass mark: 66% (CKA exam pass mark)"
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
chk_13
chk_14
finish 66
