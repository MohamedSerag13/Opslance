#!/bin/bash
# Checker for: CKA Week 1 Speed Drill - 34 kubectl Tasks
source /opt/ckalib/check_lib.sh
chk_01() { task 10 "Namespace stage exists" 'kubectl get ns stage -o name'; }

chk_02() { task 10 "Namespace billing exists" 'kubectl get ns billing -o name'; }

chk_03() { task 10 "Namespace stage carries label env=dev" 'kubectl get ns stage -o json | jq -e ".metadata.labels.env == \"dev\""'; }

chk_04() { task 10 "Pod utils runs in stage with busybox:1.36 and a sleep command" 'kubectl -n stage get pod utils -o json | jq -e ".spec.containers[0].image == \"busybox:1.36\" and (((.spec.containers[0].command // []) + (.spec.containers[0].args // [])) | index(\"sleep\") != null)"'; }

chk_05() { task 10 "Pod web-pod runs image nginx:1.27 in stage" 'kubectl -n stage get pod web-pod -o json | jq -e ".spec.containers[0].image == \"nginx:1.27\""'; }

chk_06() { task 10 "Pod env-demo in stage has env APP_ENV=production" 'kubectl -n stage get pod env-demo -o json | jq -e "(.spec.containers[0].env // []) | map(select(.name == \"APP_ENV\" and .value == \"production\")) | length > 0"'; }

chk_07() { task 10 "Pod api-pod in stage carries labels app=api and tier=backend" 'kubectl -n stage get pod api-pod -o json | jq -e ".metadata.labels.app == \"api\" and .metadata.labels.tier == \"backend\""'; }

chk_08() { task 10 "Pod redis-pod runs redis:7-alpine in billing" 'kubectl -n billing get pod redis-pod -o json | jq -e ".spec.containers[0].image == \"redis:7-alpine\""'; }

chk_09() { task 10 "Pod res-demo in stage requests cpu=100m memory=128Mi" 'kubectl -n stage get pod res-demo -o json | jq -e ".spec.containers[0].resources.requests.cpu == \"100m\" and .spec.containers[0].resources.requests.memory == \"128Mi\""'; }

chk_10() { task 10 "Pod res-demo limits cpu=250m memory=256Mi" 'kubectl -n stage get pod res-demo -o json | jq -e ".spec.containers[0].resources.limits.cpu == \"250m\" and .spec.containers[0].resources.limits.memory == \"256Mi\""'; }

chk_11() { task 10 "Pod multi in stage has exactly 2 containers (one nginx, one busybox)" 'kubectl -n stage get pod multi -o json | jq -e ".spec.containers | length == 2 and any(.spec.containers[]; .image | test(\"nginx\")) and any(.spec.containers[]; .image | test(\"busybox\"))"'; }

chk_12() { task 10 "Pod anno-pod in stage carries annotation description=week1-drill" 'kubectl -n stage get pod anno-pod -o json | jq -e ".metadata.annotations.description == \"week1-drill\""'; }

chk_13() { task 10 "Deployment web-dep in stage runs nginx:1.27 with >= 3 replicas" 'kubectl -n stage get deploy web-dep -o json | jq -e ".spec.replicas >= 3 and .spec.template.spec.containers[0].image == \"nginx:1.27\""'; }

chk_14() { task 10 "Deployment web-dep scaled to exactly 5 replicas" 'kubectl -n stage get deploy web-dep -o json | jq -e ".spec.replicas == 5"'; }

chk_15() { task 10 "Deployment canary (seeded at 1.26) updated to nginx:1.27 with revision >= 2" 'kubectl -n stage get deploy canary -o json | jq -e ".spec.template.spec.containers[0].image == \"nginx:1.27\" and (.metadata.annotations[\"deployment.kubernetes.io/revision\"] | tonumber) >= 2"'; }

chk_16() { task 10 "Deployment rollback-me shows >= 3 revisions (1.26 -> 1.28 -> undo)" 'kubectl -n stage get deploy rollback-me -o json | jq -e "(.metadata.annotations[\"deployment.kubernetes.io/revision\"] | tonumber) >= 3"'; }

chk_17() { task 10 "rollback-me image is back to nginx:1.26 after the undo" 'kubectl -n stage get deploy rollback-me -o json | jq -e ".spec.template.spec.containers[0].image == \"nginx:1.26\""'; }

chk_18() { task 10 "Service web-svc in stage: ClusterIP, port 80, targetPort 80" 'kubectl -n stage get svc web-svc -o json | jq -e ".spec.type == \"ClusterIP\" and .spec.ports[0].port == 80 and .spec.ports[0].targetPort == 80"'; }

chk_19() { task 10 "Service web-np in stage is a NodePort on 30080" 'kubectl -n stage get svc web-np -o json | jq -e ".spec.type == \"NodePort\" and .spec.ports[0].nodePort == 30080"'; }

chk_20() { task 10 "Service web-svc has at least 1 ready endpoint" 'kubectl -n stage get endpoints web-svc -o json | jq -e "[.subsets[]?.addresses[]?] | length > 0"'; }

chk_21() { task 10 "ConfigMap app-cm in stage has data KEY=value" 'kubectl -n stage get cm app-cm -o json | jq -e ".data.KEY == \"value\""'; }

chk_22() { task 10 "Secret app-sec in stage carries PASS=s3cr3t" 'kubectl -n stage get secret app-sec -o json | jq -e ".data.PASS == \"czNjcjN0\""'; }

chk_23() { task 10 "/root/secret-value.txt contains the decoded PASS value s3cr3t" 'grep -qx "s3cr3t" /root/secret-value.txt'; }

chk_24() { task 10 "ServiceAccount pipeline-sa exists in stage" 'kubectl -n stage get sa pipeline-sa -o name'; }

chk_25() { task 10 "Deployment web-dep carries annotation owner=team-x" 'kubectl -n stage get deploy web-dep -o json | jq -e ".metadata.annotations.owner == \"team-x\""'; }

chk_26() { task 10 "Job seed-job exists in stage" 'kubectl -n stage get job seed-job -o name'; }

chk_27() { task 10 "CronJob report-cron in stage runs every 5 minutes" 'kubectl -n stage get cronjob report-cron -o json | jq -e ".spec.schedule == \"*/5 * * * *\""'; }

chk_28() { task 10 "Seeded pod doomed (default ns) is deleted" '! kubectl get pod doomed -o name'; }

chk_29() { task 10 "/root/pod.yaml is a Pod manifest using an nginx image" 'kubectl apply --dry-run=client -f /root/pod.yaml -o name 2>/dev/null | grep -q "^pod/" && grep -qiE "image:[[:space:]]*nginx" /root/pod.yaml''grep -q "^kind: Pod" /root/pod.yaml && grep -q "nginx" /root/pod.yaml'; }

chk_30() { task 10 "/root/dep.yaml is a Deployment manifest with replicas: 3" 'kubectl apply --dry-run=client -f /root/dep.yaml -o name 2>/dev/null | grep -q "^deployment.apps/" && grep -qiE "replicas:[[:space:]]*3" /root/dep.yaml''grep -q "^kind: Deployment" /root/dep.yaml && grep -q "replicas: 3" /root/dep.yaml'; }

chk_31() { task 10 "/root/pod-names.txt lists >= 3 real pod names from stage" 'N=$(comm -12 <(kubectl -n stage get pods -o jsonpath="{.items[*].metadata.name}" | tr " " "\n" | sort) <(sort /root/pod-names.txt) | wc -l); [ "$N" -ge 3 ]'; }

chk_32() { task 10 "Some node carries label env=training" 'kubectl get nodes -o json | jq -e "[.items[] | select(.metadata.labels.env == \"training\")] | length >= 1"'; }

chk_33() { task 10 "Pod applied-pod runs httpd:2.4 in stage (export, edit, apply)" 'kubectl -n stage get pod applied-pod -o json | jq -e ".spec.containers[0].image == \"httpd:2.4\" and .status.phase == \"Running\""'; }

chk_34() { task 10 "/root/events.txt captures cluster events (non-empty)" '[ -s /root/events.txt ] && grep -qiE "pod|deployment|service" /root/events.txt'; }

# Single-task mode: `bash /check.sh <n>` validates only task <n> and prints
# exactly one PASS/FAIL line — used by the question runner per-question checks.
if [ $# -gt 0 ]; then
  fn="chk_$(printf '%02d' "$1" 2>/dev/null)"
  if declare -f "$fn" >/dev/null 2>&1; then "$fn"; else
    echo "  FAIL [    0] unknown task index '$1'"; fi
  exit 0
fi

# Full check: every task, in order.
echo "=== CKA Week 1 Speed Drill - 34 kubectl Tasks ==="
echo "Tasks: 34 | Pass mark: 66% (CKA exam pass mark)"
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
chk_15
chk_16
chk_17
chk_18
chk_19
chk_20
chk_21
chk_22
chk_23
chk_24
chk_25
chk_26
chk_27
chk_28
chk_29
chk_30
chk_31
chk_32
chk_33
chk_34
finish 66
