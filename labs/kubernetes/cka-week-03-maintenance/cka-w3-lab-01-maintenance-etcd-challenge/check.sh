#!/bin/bash
# Checker for: CKA Week 3 Challenge - Maintenance, etcd, Logging
source /opt/ckalib/check_lib.sh
chk_01() { task 10 "Drain (--ignore-daemonsets --delete-emptydir-data) then uncordon: bare-worker evicted, node schedulable" '! kubectl get pod bare-worker -o name && kubectl get nodes -o json | jq -e "[.items[] | select(.spec.unschedulable == true)] | length == 0"'; }

chk_02() { task 10 "etcd-helper pod Running in kube-system (k3s image, hostNetwork, /tls + /snapshots hostPaths)" 'kubectl -n kube-system get pod etcd-helper -o json | jq -e ".spec.hostNetwork == true and any(.spec.volumes[]?; .hostPath.path == \"/var/lib/rancher/k3s/server/tls\") and any(.spec.volumes[]?; (.hostPath.path // \"\") | test(\"snapshots\")) and .status.phase == \"Running\""'; }

chk_03() { task 10 "etcd snapshot saved via helper and copied to /root/etcd-backup.db (valid snapshot file)" '[ -s /root/etcd-backup.db ] && [ $(stat -c%s /root/etcd-backup.db) -ge 10000 ] && ETCDCTL_API=3 etcdctl snapshot status /root/etcd-backup.db'; }

chk_04() { task 10 "/root/snapshot-status.txt captures the snapshot status table (DB size present)" 'grep -qi "DB size" /root/snapshot-status.txt'; }

chk_05() { task 10 "/root/backup-manifest.txt contains the snapshot sha256" 'grep -q "$(sha256sum /root/etcd-backup.db | cut -d\" \" -f1)" /root/backup-manifest.txt'; }

chk_06() { task 10 "Restore drilled: etcdutl restore produced /snapshots/restored/member inside the helper" 'kubectl -n kube-system exec etcd-helper -- test -d /snapshots/restored/member'; }

chk_07() { task 10 "/root/crash.log captures logs --previous of the crash-looping fail-log deployment" 'grep -q DELIBERATE_FAILURE /root/crash.log'; }

chk_08() { task 10 "/root/top-pods.txt has live metrics-server output for all pods" '[ -s /root/top-pods.txt ] && grep -qiE "CPU\(|cpu" /root/top-pods.txt'; }

chk_09() { task 10 "/root/events-ops.txt shows events mentioning fail-log" 'grep -q fail-log /root/events-ops.txt'; }

chk_10() { task 10 "/root/static-manifests.txt lists the k3s static pod manifests (coredns visible)" 'grep -qi coredns /root/static-manifests.txt'; }

chk_11() { task 10 "/root/node-describe.txt is a node describe output containing Conditions" 'grep -q Conditions /root/node-describe.txt'; }

chk_12() { task 10 "etcd endpoint health verified through the helper" 'kubectl -n kube-system exec etcd-helper -- sh -c "ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 --cacert /tls/etcd/ca.crt --cert /tls/etcd/client.crt --key /tls/etcd/client.key endpoint health" | grep -qi successfully'; }

# Single-task mode: `bash /check.sh <n>` validates only task <n> and prints
# exactly one PASS/FAIL line — used by the question runner per-question checks.
if [ $# -gt 0 ]; then
  fn="chk_$(printf '%02d' "$1" 2>/dev/null)"
  if declare -f "$fn" >/dev/null 2>&1; then "$fn"; else
    echo "  FAIL [    0] unknown task index '$1'"; fi
  exit 0
fi

# Full check: every task, in order.
echo "=== CKA Week 3 Challenge - Maintenance, etcd, Logging ==="
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
