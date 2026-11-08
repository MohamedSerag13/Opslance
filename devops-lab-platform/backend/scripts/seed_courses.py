#!/usr/bin/env python3
"""Seed the Courses catalog: the CKA-in-8-weeks study plan + Linux Fundamentals.

Idempotent — safe to run on every boot (db-init runs it after seed_admin).
The CKA plan embeds the full 8-week / 56-day structure; the Linux course
derives its weeks from the labs/linux/ module folders when they are reachable
(LABS_DIR env, /labs-repo mount, or ../labs relative), falling back to the
embedded module list captured at authoring time.

Run:  cd backend && PYTHONPATH="$PWD" python scripts/seed_courses.py
"""
import json
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal  # noqa: E402
import models  # noqa: E402

# ---------------------------------------------------------------------------
# CKA course — description (Markdown) rendered by the course detail page
# ---------------------------------------------------------------------------

CKA_DESCRIPTION = """## About this plan

Eight weeks, five study days (2 h each), one lab day (3–4 h) and one review
day (1 h) per week — 14 hours a week, exam-ready by **Dec 25, 2026**.
The course wraps three sources into one routine: the book chapters, the
KodeKloud CKA course, and hands-on platform labs.

### Book reading map

| Ch | Chapter | Pages | Read in |
|----|---------|-------|---------|
| 3 | Imperative commands & kubectl basics | 31–36 | Week 1, Day 4 |
| 4 | Common kubectl Commands | 37–43 | Week 1, Day 1 |
| 5 | Pods | 45–54 | Week 1, Day 2 |
| 6 | Labels and Annotations | 65–73 | Week 1, Day 3 |
| 9 | ReplicaSets | 103–112 | Week 1, Day 5 |
| 10–12 | Deployments, Services, Scheduling | — | Week 2 |
| 13–15 | ConfigMaps, Secrets, Resource limits | — | Week 3 |
| 16–18 | Networking, Ingress, DNS | — | Week 4 |
| 19–21 | Volumes, PV/PVC, StorageClasses | — | Week 5 |
| 22–24 | AuthN/AuthZ, RBAC, Security contexts | — | Week 6 |
| 25–27 | Cluster maintenance, etcd, upgrades | — | Week 7 |
| 28–30 | Troubleshooting, node issues, mocks | — | Week 8 |

### Exam shell setup (do it every mock, learn it by heart)

```bash
# 1. Set aliases and completion in the exam terminal
kubectl config get-contexts            # pick the right cluster FIRST
alias k=kubectl
source <(kubectl completion bash | sed 's/kubectl/k/g')
complete -F __start_k k

# 2. vim defaults for k8s manifests
cat >> ~/.vimrc <<'EOT'
set expandtab
set tabstop=2
set shiftwidth=2
EOT

# 3. Dry-run + explain are your best friends — no docs needed for boilerplate
kubectl create deployment nginx --image=nginx --dry-run=client -o yaml
kubectl explain pod.spec.containers --recursive | less
```

### Command cheat sheet

```bash
# Workloads
k run nginx --image=nginx --restart=Never
k create deployment web --image=nginx --replicas=3
k scale deploy web --replicas=5
k set image deploy/web nginx=nginx:1.27
k rollout undo deploy/web
k rollout history deploy/web
k create job pi --image=perl -n batch
k create cronjob tick --image=busybox --schedule="*/1 * * * *" -- date

# Debugging (the exam is 30% this)
k get events -A --sort-by=.lastTimestamp
k describe pod <p> | sed -n '/Events:/,$p'
k logs <p> [-c c] [-f] [--previous]
k exec -it <p> -- sh
k port-forward <p> 8080:80

# Services & networking
k expose pod nginx --port=80 --target-port=80 --name=svc1
k run tmp --image=busybox --rm -it --restart=Never -- wget -O- http://svc1:80

# etcd & cluster (kubeadm)
ETCDCTL_API=3 etcdctl snapshot save /tmp/snap.db \\
  --endpoints=https://127.0.0.1:2379 \\
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \\
  --cert=/etc/kubernetes/pki/etcd/server.crt \\
  --key=/etc/kubernetes/pki/etcd/server.key
kubeadm upgrade plan
kubectl drain node1 --ignore-daemonsets

# RBAC
kubectl create role dev --verb=get,list --resource=pods
kubectl create rolebinding dev-b --role=dev --user=dev-user -n dev
k auth can-i create deployments --as=dev-user -n dev
```

### Daily routine rules

1. **Timers on, always.** 2 h study days: 40 min book → 40 min course → 40 min lab.
2. **Type every command** — reading is not practice; muscle memory is the exam skill.
3. **Keep `mistakes.md`.** Every failed check and wrong flag goes in it; review day consumes it.
4. **Flag questions in mocks, never stall.** Mark, move on, come back — the exam is a sprint.
5. **Lab day is sacred.** Nothing new — only redoing every failed lab of the week until clean.
6. **Gate before you advance.** A week is done when its gate passes from a blank cluster.
"""

# ---------------------------------------------------------------------------
# CKA weeks — day objects use the exact shape from the plan spec
# ---------------------------------------------------------------------------


def _day(day_index, label, kind, items):
    return {"day_index": day_index, "label": label, "type": kind, "items": items}


def _study(read, course, lab):
    return [
        {"tick": "read", "text": read},
        {"tick": "course", "text": course},
        {"tick": "lab", "text": lab},
    ]


WEEK_DATES = [
    "Oct 30 – Nov 5", "Nov 6 – Nov 12", "Nov 13 – Nov 19", "Nov 20 – Nov 26",
    "Nov 27 – Dec 3", "Dec 4 – Dec 10", "Dec 11 – Dec 17", "Dec 18 – Dec 24",
]
_DAY_LABELS = ["Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu"]
_DATE_STARTS = [(10, 30), (11, 6), (11, 13), (11, 20), (11, 27), (12, 4), (12, 11), (12, 18)]
_MONTH_DAYS = {10: 31, 11: 30, 12: 31}


def _week_day_labels(week_idx):
    """Calendar labels Fri..Thu for a week, e.g. W1: Fri Oct 30 ... Thu Nov 5."""
    m, d = _DATE_STARTS[week_idx]
    out = []
    for i in range(7):
        label = f"{_DAY_LABELS[i]} {['', 'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m]} {d}"
        out.append(label)
        d += 1
        if d > _MONTH_DAYS[m]:
            d = 1
            m = 12 if m == 12 else m + 1
    return out


def _week(week_number, title, focus, exam_domain, gate, study_days):
    labels = _week_day_labels(week_number - 1)
    days = []
    for i, (read, course, lab) in enumerate(study_days):
        days.append(_day(i, labels[i], "study", _study(read, course, lab)))
    days.append(_day(5, labels[5], "lab_day",
                     [{"tick": "lab", "text": f"Lab (3–4 h): redo every failed lab from week {week_number}, then the timed drill for this domain"}]))
    days.append(_day(6, labels[6], "review",
                     [{"tick": "read", "text": f"Review (1 h): reread mistakes.md, redo the five worst items of week {week_number}"}]))
    return {
        "week_number": week_number,
        "title": title,
        "dates": WEEK_DATES[week_number - 1],
        "focus": focus,
        "exam_domain": exam_domain,
        "gate": gate,
        "days": days,
    }


CKA_WEEKS = [
    {
        "week_number": 1,
        "title": "Foundations and kubectl speed",
        "dates": WEEK_DATES[0],
        "focus": "Cluster architecture, etcd, kube-apiserver, Pods, ReplicaSets, Services — and a kubectl setup that makes everything after it faster.",
        "exam_domain": "CKA",
        "gate": "From a blank cluster: create a pod, scale a Deployment to 3, expose it with a NodePort service — all with `k` aliases, under 10 minutes.",
        "days": [
            {
                "day_index": 0,
                "label": "Fri Oct 30",
                "type": "study",
                "items": [
                    {"tick": "read", "text": "Ch 4 Common kubectl Commands (pp. 37–43) + exam shell setup"},
                    {"tick": "course", "text": "KodeKloud Introduction, Core Concepts (cluster architecture, etcd, kube-apiserver)"},
                    {"tick": "lab", "text": "set up aliases, vim and completion; first labs of the section"},
                ],
            },
            {
                "day_index": 1,
                "label": "Sat Oct 31",
                "type": "study",
                "items": [
                    {"tick": "read", "text": "Ch 5 Pods (pp. 45–54, through Copying Files to and from Containers)"},
                    {"tick": "course", "text": "Core Concepts: controller-manager, scheduler, kubelet, kube-proxy, Pods"},
                    {"tick": "lab", "text": "Pod labs; create pods with kubectl run and $do"},
                ],
            },
            {
                "day_index": 2,
                "label": "Sun Nov 1",
                "type": "study",
                "items": [
                    {"tick": "read", "text": "Ch 6 Labels and Annotations (pp. 65–73)"},
                    {"tick": "course", "text": "Core Concepts: ReplicaSets, Deployments"},
                    {"tick": "lab", "text": "ReplicaSet and Deployment labs; fix a broken selector"},
                ],
            },
            {
                "day_index": 3,
                "label": "Mon Nov 2",
                "type": "study",
                "items": [
                    {"tick": "read", "text": "kubernetes.io docs on Namespaces and Services; Ch 3 pp. 31–36"},
                    {"tick": "course", "text": "Core Concepts: Namespaces, Services (ClusterIP, NodePort)"},
                    {"tick": "lab", "text": "namespace and service labs; use kubectl expose"},
                ],
            },
            {
                "day_index": 4,
                "label": "Tue Nov 3",
                "type": "study",
                "items": [
                    {"tick": "read", "text": "Ch 9 ReplicaSets (pp. 103–112); kubectl Quick Reference"},
                    {"tick": "course", "text": "imperative vs declarative commands, kubectl apply"},
                    {"tick": "lab", "text": "imperative-commands lab, then a 10-task speed test"},
                ],
            },
            {
                "day_index": 5,
                "label": "Wed Nov 4",
                "type": "lab_day",
                "items": [
                    {"tick": "lab", "text": "Lab (3–4 h): redo every failed lab from the week, then 20 imperative tasks against the clock"},
                ],
            },
            {
                "day_index": 6,
                "label": "Thu Nov 5",
                "type": "review",
                "items": [
                    {"tick": "read", "text": "Review (1 h): reread mistakes.md, redo the five worst items"},
                ],
            },
        ],
    },
    _week(2, "Workloads, scheduling and rollouts",
          "Deployments in depth, DaemonSets, StatefulSets, Jobs/CronJobs, resource requests/limits, node selectors, taints and tolerations.",
          "Workloads & Scheduling",
          "Schedule a pod onto a tainted worker with the right toleration and resource limits; rolling-update and roll back a Deployment without downtime.",
          [
              ("Ch 10 Deployments (pp. 113–126); kubernetes.io Deployment docs",
               "Workloads: Deployments, rollout strategies (Recreate vs RollingUpdate), maxSurge/maxUnavailable",
               "Deployment rollout labs: canary a new image, pause a rollout, roll back"),
              ("Ch 11 DaemonSets and StatefulSets",
               "Workloads: DaemonSets (logs/monitoring per node), StatefulSets (stable identity, headless services)",
               "StatefulSet lab: deploy a 3-replica StatefulSet with a headless service, inspect ordered rollout"),
              ("Ch 12 Jobs and CronJobs",
               "Workloads: Jobs (completions, parallelism, backoffLimit), CronJobs (schedules, concurrencyPolicy)",
               "Job/CronJob labs: parallel batch job + cron cleanup job with an off-hours schedule guard"),
              ("kubernetes.io: Assign Pods to Nodes",
               "Scheduling: nodeSelector, affinity/anti-affinity, taints & tolerations",
               "Scheduling labs: pin a pod by affinity, survive a tainted node, drain safely"),
              ("kubernetes.io: Resource Management for Pods",
               "Scheduling: requests/limits, LimitRanges, ResourceQuotas, OOMKilled triage",
               "Quota labs: hit a namespace quota on purpose, read the events, fix it"),
          ]),
    _week(3, "Configuration: ConfigMaps, Secrets and probes",
          "Application configuration, secret handling, liveness/readiness/startup probes and init containers.",
          "Workloads & Scheduling",
          "Deploy an app that reads a Secret as env + a ConfigMap as a mounted volume, with a working readiness gate — zero restarts in 5 minutes.",
          [
              ("Ch 13 ConfigMaps (pp. 183–196)",
               "Configuration: ConfigMaps as env vars, files, volumes; immutable ConfigMaps",
               "ConfigMap labs: hot-reload a mounted config, compare env vs volume behaviour"),
              ("Ch 14 Secrets (pp. 197–210)",
               "Configuration: Secrets (opaque, docker-registry), base64 vs stringData, mounting as files",
               "Secret labs: create TLS + registry secrets, consume them in a pod"),
              ("kubernetes.io: Configure Liveness, Readiness and Startup Probes",
               "Probes: httpGet, tcpSocket, exec; initialDelay, period, failureThreshold",
               "Probe labs: break an app on purpose, watch probes gate traffic, fix it"),
              ("kubernetes.io: Init Containers",
               "Pod lifecycle: init containers, sidecars, terminationGracePeriod, preStop hooks",
               "Init-container lab: gate app startup on a service check; graceful-shutdown drill"),
              ("Ch 15 multi-container pods patterns",
               "Patterns: sidecar, ambassador, adapter — when each fits",
               "Pattern labs: build a log-sidecar pod; exec between containers"),
          ]),
    _week(4, "Services, networking and Ingress",
          "kube-proxy, Service types, DNS, NetworkPolicies and Ingress controllers.",
          "Services & Networking",
          "Expose an app through an Ingress with path routing + TLS; write a NetworkPolicy that blocks cross-namespace traffic but allows DNS.",
          [
              ("Ch 16 Services (pp. 235–252)",
               "Networking: ClusterIP/NodePort/LoadBalancer, endpoints and Endpointslices, kube-proxy modes",
               "Service labs: debug a selector-less service, manually manage Endpoints"),
              ("kubernetes.io: DNS for Services and Pods",
               "Networking: cluster DNS names (svc.ns.svc.cluster.local), CoreDNS basics",
               "DNS labs: resolve services from busybox pods; stub domain drill"),
              ("Ch 17 NetworkPolicies",
               "Networking: default allow, ingress/egress policies, policy selection by pod/namespace labels",
               "NetworkPolicy labs: default-deny a namespace, then allow-list exactly one path"),
              ("kubernetes.io: Ingress",
               "Networking: Ingress resources, controllers, path/host routing, TLS termination",
               "Ingress lab: route two apps by path with one controller, add TLS"),
              ("Ch 18 CNI deep-dive (Calico/Flannel overview)",
               "Networking: how pods get IPs, CNI plugin roles, troubleshooting basic connectivity",
               "Connectivity drills: tcpdump inside a pod, trace a dropped packet"),
          ]),
    _week(5, "Storage: Volumes, PV/PVC and StatefulSet data",
          "Volume types, PersistentVolumes/Claims, access modes, StorageClasses and expanding stateful workloads.",
          "Storage",
          "Dynamically provision a PVC, bind it to a StatefulSet, and shrink-free expand it — data survives a pod delete.",
          [
              ("Ch 19 Volumes (pp. 279–292)",
               "Storage: emptyDir, hostPath, projected volumes (secrets/configmaps/downwardAPI)",
               "Volume labs: share an emptyDir between containers, mount a projected volume"),
              ("Ch 20 PersistentVolumes & Claims",
               "Storage: PV/PVC lifecycle, access modes, reclaim policies, binding delays",
               "PV/PVC labs: static-provision a hostPath PV, bind a PVC, watch the phases"),
              ("kubernetes.io: Storage Classes",
               "Storage: StorageClasses, provisioners, volumeBindingMode, parameters",
               "Dynamic provisioning lab: create a StorageClass + PVC, verify the auto PV"),
              ("kubernetes.io: Change PVC Access Mode / Expand",
               "Storage: expanding PVCs, CSI snapshots, volume cloning",
               "Expansion lab: grow a PVC in place; snapshot and restore it"),
              ("Ch 21 StatefulSets with storage",
               "Storage: volumeClaimTemplates, per-pod PVCs, ordered teardown",
               "Stateful data lab: 3-replica StatefulSet, delete one pod, prove data survival"),
          ]),
    _week(6, "Security: authN, authZ and pod security",
          "ServiceAccounts, RBAC, security contexts, Pod Security Admission and certificate basics.",
          "Cluster Administration, Security",
          "Create a namespace-scoped RBAC setup where 'dev-user' can only manage pods — prove it with k auth can-i.",
          [
              ("Ch 22 ServiceAccounts & AuthN",
               "Security: users vs service accounts, tokens, projected SA tokens",
               "SA labs: create an SA, run a pod with it, inspect the mounted token"),
              ("Ch 23 RBAC (pp. 337–352)",
               "Security: Roles, ClusterRoles, Bindings, aggregation, wildcards",
               "RBAC labs: build the least-privilege dev role; audit with auth can-i"),
              ("kubernetes.io: Security Contexts",
               "Security: runAsUser, fsGroup, capabilities, privileged vs unprivileged",
               "Security-context labs: drop NET_RAW, run non-root, verify from inside"),
              ("kubernetes.io: Pod Security Admission",
               "Security: PSA levels (privileged/baseline/restricted), namespace labels",
               "PSA lab: enforce restricted on a namespace, fix a violating pod"),
              ("kubernetes.io: TLS in Kubernetes",
               "Security: cluster certificates, CSR API, rotating a cert with kubeadm",
               "Certificate lab: issue a user cert, add it to a kubeconfig, auth as it"),
          ]),
    _week(7, "Cluster administration: etcd, upgrades and node ops",
          "etcd backup/restore, kubeadm upgrades, node cordon/drain, kernel-level node troubleshooting.",
          "Cluster Administration",
          "Back up etcd, tear a node down, restore etcd to the snapshot, and upgrade the control plane one minor version — in that order, cleanly.",
          [
              ("Ch 25 etcd (pp. 375–390)",
               "Cluster admin: etcd internals, snapshot save/restore, defrag, endpoints health",
               "etcd lab: snapshot, add a dummy object, restore from snapshot, verify"),
              ("kubernetes.io: Upgrading kubeadm clusters",
               "Cluster admin: kubeadm upgrade plan/apply, cordon+drain, kubelet upgrade",
               "Upgrade lab: upgrade a control-plane node + one worker step by step"),
              ("kubernetes.io: Node maintenance",
               "Cluster admin: cordon/uncordon, drain --ignore-daemonsets, pod eviction budget",
               "Node ops lab: drain safely, replace a fake failed node, rebalance"),
              ("Ch 26 kubelet & node debugging",
               "Cluster admin: kubelet config, journalctl, container runtime (containerd) checks",
               "Node triage lab: read crictl/journalctl to find why a node is NotReady"),
              ("Ch 27 backup strategy review",
               "Cluster admin: what to back up (etcd, PKI, manifests), restore runbooks",
               "Runbook lab: execute a full cluster-restore drill from your own notes"),
          ]),
    _week(8, "Troubleshooting and mock exams",
          "The exam domains end-to-end: broken pods, services, nodes and clusters — plus full timed mocks.",
          "Troubleshooting (all domains)",
          "Score ≥ 66% on two consecutive full mock exams inside 2 hours each.",
          [
              ("Ch 28 Troubleshooting workloads",
               "Troubleshooting: CrashLoopBackOff, ImagePullBackOff, pending pods, OOM kills",
               "Troubleshooting labs: fix 10 intentionally broken workloads as fast as possible"),
              ("Ch 29 Troubleshooting services & networking",
               "Troubleshooting: no endpoints, wrong selectors, DNS failures, policy blocks",
               "Service-debug lab: a 5-fault gauntlet from pod to Ingress"),
              ("Ch 30 Node & control-plane failures",
               "Troubleshooting: NotReady nodes, apiserver down, certificate expiry, disk pressure",
               "Cluster-debug lab: revive a cluster with an expired cert + dead kubelet"),
              ("Mock exam #1 (killer.sh style, 2 h)",
               "Exam craft: flag-and-move, dry-run boilerplate, context switching discipline",
               "Timed mock: full 17-question set, review every miss into mistakes.md"),
              ("Mock exam #2 + weak-domain patching",
               "Exam craft: second pass targeting your weakest domain from mock #1",
               "Timed mock: repeat until ≥ 66% twice; final shell-setup rehearsal"),
          ]),
]

# ---------------------------------------------------------------------------
# Linux course — weeks from labs/linux module folders
# ---------------------------------------------------------------------------

_EMBEDDED_LINUX_MODULES = [
    "module-01-linux-fundamentals",
    "module-02-file-navigation-and-search",
    "module-03-file-permissions-and-ownership",
    "module-04-processes-and-services",
    "module-05-network-troubleshooting",
    "module-06-users-and-groups",
    "module-07-text-processing",
    "module-08-shell-scripting",
    "module-09-package-management",
    "module-10-archiving-and-compression",
    "module-11-storage-and-disk-usage",
    "module-12-shell-environment",
    "module-13-ssh-and-remote-access",
    "module-14-scheduling-and-automation",
    "module-15-monitoring-and-logs",
]

_LINUX_DESCRIPTION = """## About this course

Fifteen hands-on modules from shell basics to log analysis. Every module maps
1:1 to a week and to the matching module labs on the platform — the course is
the structured wrapper, the labs are the practice ground.

### How each week works

1. **Read** the module intro and skim the command reference for that topic.
2. **Watch** the corresponding video/notes section, then close it.
3. **Do** every module lab in the platform until each passes without the hint.

### The one rule

If a lab needs a hint to pass, it isn't passed yet — redo it the next day
from scratch. Linux fluency is recall speed, and recall speed only comes
from repetition without scaffolding.
"""


def _linux_module_weeks():
    """One CourseWeek per labs/linux module folder (folder name de-slugged)."""
    modules = list(_EMBEDDED_LINUX_MODULES)
    labs_dir = os.getenv("LABS_DIR") or "/labs-repo/linux"
    if not os.path.isdir(labs_dir):
        candidate = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "labs", "linux")
        if os.path.isdir(candidate):
            labs_dir = candidate
    if os.path.isdir(labs_dir):
        modules = sorted(
            d for d in os.listdir(labs_dir)
            if d.startswith("module-") and os.path.isdir(os.path.join(labs_dir, d))
        )
        print(f"[seed-courses] linux weeks read from {labs_dir}: {len(modules)} modules")
    else:
        print(f"[seed-courses] labs dir {labs_dir} not found — using embedded module list")

    weeks = []
    for idx, folder in enumerate(modules, start=1):
        title = folder.split("-", 2)[2].replace("-", " ").title() if folder.count("-") >= 2 else folder.replace("-", " ").title()
        weeks.append({
            "week_number": idx,
            "title": title,
            "dates": None,
            "focus": f"Module {folder.split('-')[1]}: {title.lower()} — read the module intro, then work through every lab in order.",
            "exam_domain": "Linux",
            "gate": f"All module-{idx:02d} labs pass without hints, twice in a row.",
            "days": [
                _day(0, f"Day 1", "study", _study(
                    f"Module intro: {title.lower()} — read the reference notes",
                    f"{title}: watch the module section, take 10 lines of notes max",
                    f"Finish the first half of the module-{idx:02d} labs",
                )),
                _day(1, f"Day 2", "lab_day", [
                    {"tick": "lab", "text": f"Finish the second half of the module-{idx:02d} labs; redo any lab that needed a hint"},
                ]),
            ],
        })
    return weeks


# ---------------------------------------------------------------------------
# Seeding
# ---------------------------------------------------------------------------

def upsert_course(db, spec) -> None:
    course = db.query(models.Course).filter_by(id=spec["id"]).first()
    if course is None:
        course = models.Course(id=spec["id"])
        db.add(course)
    for key in ("slug", "title", "subtitle", "description", "author", "duration_weeks",
                "hours_per_week", "exam_domain", "pass_mark", "difficulty", "tags",
                "is_active", "cover_color"):
        setattr(course, key, spec.get(key))
    course.published_at = spec.get("published_at")

    # weeks: wipe and re-create (cascade delete-orphan keeps rows consistent)
    db.query(models.CourseWeek).filter_by(course_id=course.id).delete()
    for wspec in spec["weeks"]:
        db.add(models.CourseWeek(
            course_id=course.id,
            week_number=wspec["week_number"],
            title=wspec["title"],
            dates=wspec.get("dates"),
            focus=wspec.get("focus"),
            exam_domain=wspec.get("exam_domain"),
            gate=wspec.get("gate"),
            days=json.dumps(wspec["days"]),
        ))
    db.commit()


def main() -> None:
    db = SessionLocal()
    try:
        cka = {
            "id": "cka-8-weeks",
            "slug": "cka-8-weeks",
            "title": "CKA in 8 Weeks",
            "subtitle": "Certified Kubernetes Administrator — exam-ready by Dec 25, 2026",
            "description": CKA_DESCRIPTION,
            "author": "@mohamed",
            "published_at": datetime(2026, 10, 23, tzinfo=timezone.utc),
            "duration_weeks": 8,
            "hours_per_week": 14,
            "exam_domain": "CKA",
            "pass_mark": 66,
            "difficulty": "advanced",
            "tags": json.dumps(["kubernetes", "cka", "k8s", "certification", "kubectl", "etcd", "kubeadm"]),
            "is_active": True,
            "cover_color": "primary",
            "weeks": CKA_WEEKS,
        }
        linux = {
            "id": "linux-fundamentals",
            "slug": "linux-fundamentals",
            "title": "Linux Fundamentals",
            "subtitle": "15 hands-on modules from shell basics to network troubleshooting",
            "description": _LINUX_DESCRIPTION,
            "author": "@mohamed",
            "published_at": datetime(2026, 10, 23, tzinfo=timezone.utc),
            "duration_weeks": 15,
            "hours_per_week": 6,
            "exam_domain": "Linux",
            "pass_mark": None,
            "difficulty": "beginner",
            "tags": json.dumps(["linux", "bash", "systemd", "permissions", "networking", "shell"]),
            "is_active": True,
            "cover_color": "success",
            "weeks": _linux_module_weeks(),
        }
        upsert_course(db, cka)
        upsert_course(db, linux)
        print("[seed-courses] seeded: cka-8-weeks (8 weeks / 56 days), linux-fundamentals")
    finally:
        db.close()


if __name__ == "__main__":
    main()
