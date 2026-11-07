#!/bin/bash
# Checker for: CKA Week 8 Mock Exam - 18 Questions, 120 Minutes
source /opt/ckalib/check_lib.sh
chk_01() { task 10 "Namespace exam created and set as the current-context namespace" 'kubectl get ns exam -o name && [ "$(kubectl config view --minify -o jsonpath="{..namespace}")" = "exam" ]'; }

chk_02() { task 10 "Pod fast runs nginx:1.27 in exam and is Running" 'kubectl -n exam get pod fast -o json | jq -e ".spec.containers[0].image == \"nginx:1.27\" and .status.phase == \"Running\""'; }

chk_03() { task 10 "Deployment api: 4 replicas of nginx:1.27, all Ready" 'kubectl -n exam get deploy api -o json | jq -e ".spec.replicas == 4 and .status.readyReplicas == 4"'; }

chk_04() { task 10 "legacy-app updated to nginx:1.27 (revision >= 2)" 'kubectl -n exam get deploy legacy-app -o json | jq -e ".spec.template.spec.containers[0].image == \"nginx:1.27\" and (.metadata.annotations[\"deployment.kubernetes.io/revision\"] | tonumber) >= 2"'; }

chk_05() { task 10 "ConfigMap exam-cm (KEY1=val1) and Secret exam-sec (PASS=topsecret) in exam" 'kubectl -n exam get cm exam-cm -o json | jq -e ".data.KEY1 == \"val1\"" && kubectl -n exam get secret exam-sec -o json | jq -e ".data.PASS == \"dG9wc2VjcmV0\""'; }

chk_06() { task 10 "CronJob backup-cron runs daily at 01:00 (0 1 * * *)" 'kubectl -n exam get cronjob backup-cron -o json | jq -e ".spec.schedule == \"0 1 * * *\""'; }

chk_07() { task 10 "Service api-svc (80) exposes deploy api with ready endpoints" 'kubectl -n exam get svc api-svc -o json | jq -e ".spec.ports[0].port == 80" && kubectl -n exam get endpoints api-svc -o json | jq -e "[.subsets[]?.addresses[]?] | length > 0"'; }

chk_08() { task 10 "Node tainted exam=drain:NoSchedule; pod tol-pod tolerates it and runs" 'kubectl get nodes -o json | jq -e "[.items[].spec.taints[]?] | map(select(.key == \"exam\" and .value == \"drain\")) | length >= 1" && kubectl -n exam get pod tol-pod -o json | jq -e "any(.spec.tolerations // []; .key == \"exam\") and .status.phase == \"Running\""'; }

chk_09() { task 10 "RBAC: SA deployer + Role deployer-role (create deployments) + RoleBinding in exam" 'kubectl -n exam get sa deployer -o name && kubectl -n exam get role deployer-role -o json | jq -e "[.rules[] | select((.resources // []) | index(\"deployments\")) | .verbs[]] | index(\"create\") != null" && kubectl -n exam get rolebinding deployer-binding -o json | jq -e ".roleRef.name == \"deployer-role\" and ([.subjects[] | select(.name == \"deployer\")] | length == 1)"'; }

chk_10() { task 10 "auth can-i: deployer SA CAN create deployments in exam" 'kubectl -n exam auth can-i create deployments --as=system:serviceaccount:exam:deployer | grep -qx yes'; }

chk_11() { task 10 "NetworkPolicy in exam: client cannot reach protected, DNS still works" '! kubectl -n exam exec deploy/client -- wget -qO- -T 3 http://protected && kubectl -n exam exec deploy/client -- nslookup kubernetes.default.svc.cluster.local'; }

chk_12() { task 10 "Storage: PVC exam-pvc (1Gi, local-path) Bound and mounted in pod pvc-pod" 'kubectl -n exam get pvc exam-pvc -o json | jq -e ".status.phase == \"Bound\"" && kubectl -n exam get pod pvc-pod -o json | jq -e "any(.spec.volumes[]?; .persistentVolumeClaim.claimName == \"exam-pvc\") and .status.phase == \"Running\""'; }

chk_13() { task 10 "etcd backup: snapshot copied to /root/exam-snap.db and verified" '[ -s /root/exam-snap.db ] && ETCDCTL_API=3 etcdctl snapshot status /root/exam-snap.db'; }

chk_14() { task 10 "Helm release exam-rel installed in exam with replicaCount 2" 'helm -n exam list -o json | jq -e ".[] | select(.name == \"exam-rel\" and .status == \"deployed\")" && kubectl -n exam get deploy -o json | jq -e "[.items[] | select(.spec.replicas == 2)] | length >= 1"'; }

chk_15() { task 10 "Kustomize overlay applied: kust-web at 2 replicas on nginx:1.28 in exam" 'kubectl -n exam get deploy kust-web -o json | jq -e ".spec.replicas == 2 and .spec.template.spec.containers[0].image == \"nginx:1.28\""'; }

chk_16() { task 10 "Ingress exam-ing: exam.example.com -> api-svc verified with curl" 'NP=$(kubectl -n ingress-nginx get svc ingress-nginx-controller -o jsonpath="{.spec.ports[?(@.port==80)].nodePort}"); curl -s -H "Host: exam.example.com" "http://k3s-server:${NP}/" | grep -qi nginx'; }

chk_17() { task 10 "fixme repaired: 2 replicas of nginx:1.27 all Ready (was 0 replicas, broken image)" 'kubectl -n exam get deploy fixme -o json | jq -e ".spec.replicas == 2 and .spec.template.spec.containers[0].image == \"nginx:1.27\" and .status.readyReplicas == 2"'; }

chk_18() { task 10 "/root/pod-ips.txt contains the live IP of pod fast" 'grep -q "$(kubectl -n exam get pod fast -o jsonpath="{.status.podIP}")" /root/pod-ips.txt'; }

# Single-task mode: `bash /check.sh <n>` validates only task <n> and prints
# exactly one PASS/FAIL line — used by the question runner per-question checks.
if [ $# -gt 0 ]; then
  fn="chk_$(printf '%02d' "$1" 2>/dev/null)"
  if declare -f "$fn" >/dev/null 2>&1; then "$fn"; else
    echo "  FAIL [    0] unknown task index '$1'"; fi
  exit 0
fi

# Full check: every task, in order.
echo "=== CKA Week 8 Mock Exam - 18 Questions, 120 Minutes ==="
echo "Tasks: 18 | Pass mark: 66% (CKA exam pass mark)"
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
finish 66
