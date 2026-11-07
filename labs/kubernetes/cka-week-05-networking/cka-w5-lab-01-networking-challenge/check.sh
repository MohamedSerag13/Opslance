#!/bin/bash
# Checker for: CKA Week 5 Challenge - Services, DNS, Ingress, NetworkPolicy
source /opt/ckalib/check_lib.sh
chk_01() { task 10 "Service web-a-svc (ClusterIP 80) in apps has ready endpoints" 'kubectl -n apps get svc web-a-svc -o json | jq -e ".spec.type == \"ClusterIP\" and .spec.ports[0].port == 80" && kubectl -n apps get endpoints web-a-svc -o json | jq -e "[.subsets[]?.addresses[]?] | length > 0"'; }

chk_02() { task 10 "Service web-a-np in apps is a NodePort" 'kubectl -n apps get svc web-a-np -o json | jq -e ".spec.type == \"NodePort\" and .spec.ports[0].port == 80"'; }

chk_03() { task 10 "Headless Service web-a-headless in apps (clusterIP: None)" 'kubectl -n apps get svc web-a-headless -o json | jq -e ".spec.clusterIP == \"None\""'; }

chk_04() { task 10 "ExternalName Service external-db points to db.example.com" 'kubectl -n apps get svc external-db -o json | jq -e ".spec.type == \"ExternalName\" and .spec.externalName == \"db.example.com\""'; }

chk_05() { task 10 "Cluster DNS resolves web-a-svc.apps.svc.cluster.local from a pod" 'kubectl -n apps run dns-verify --image=busybox:1.36 --rm -i --restart=Never -- nslookup web-a-svc.apps.svc.cluster.local'; }

chk_06() { task 10 "Ingress app-ingress routes app.example.com to web-a-svc (verified with curl)" 'NP=$(kubectl -n ingress-nginx get svc ingress-nginx-controller -o jsonpath="{.spec.ports[?(@.port==80)].nodePort}"); curl -s -H "Host: app.example.com" "http://k3s-server:${NP}/" | grep -qi nginx'; }

chk_07() { task 10 "Second virtual host api.example.com routes to web-b-svc (curl shows the httpd page)" 'NP=$(kubectl -n ingress-nginx get svc ingress-nginx-controller -o jsonpath="{.spec.ports[?(@.port==80)].nodePort}"); curl -s -H "Host: api.example.com" "http://k3s-server:${NP}/" | grep -qi "It works"'; }

chk_08() { task 10 "TLS ingress: secret app-tls serves https for app.example.com (curl -k)" 'kubectl -n apps get secret app-tls -o json | jq -e ".type == \"kubernetes.io/tls\"" && NP=$(kubectl -n ingress-nginx get svc ingress-nginx-controller -o jsonpath="{.spec.ports[?(@.port==443)].nodePort}") && curl -sk -H "Host: app.example.com" "https://k3s-server:${NP}/" | grep -qi nginx'; }

chk_09() { task 10 "NetworkPolicy default-deny in secure: client CANNOT reach protected (live traffic)" '! kubectl -n secure exec deploy/client -- wget -qO- -T 3 http://protected'; }

chk_10() { task 10 "Allow rule: client2 (label access=allowed) CAN reach protected" 'kubectl -n secure exec deploy/client2 -- wget -qO- -T 3 http://protected | grep -qi nginx'; }

chk_11() { task 10 "DNS egress preserved: client can still resolve kubernetes.default" 'kubectl -n secure exec deploy/client -- nslookup kubernetes.default.svc.cluster.local'; }

chk_12() { task 10 "Gateway API: a Gateway and an HTTPRoute exist (class cka-gc)" 'kubectl get gateway -A -o json | jq -e "[.items[] | select(.spec.gatewayClassName == \"cka-gc\")] | length >= 1" && kubectl get httproute -A -o name | grep -q .'; }

# Single-task mode: `bash /check.sh <n>` validates only task <n> and prints
# exactly one PASS/FAIL line — used by the question runner per-question checks.
if [ $# -gt 0 ]; then
  fn="chk_$(printf '%02d' "$1" 2>/dev/null)"
  if declare -f "$fn" >/dev/null 2>&1; then "$fn"; else
    echo "  FAIL [    0] unknown task index '$1'"; fi
  exit 0
fi

# Full check: every task, in order.
echo "=== CKA Week 5 Challenge - Services, DNS, Ingress, NetworkPolicy ==="
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
