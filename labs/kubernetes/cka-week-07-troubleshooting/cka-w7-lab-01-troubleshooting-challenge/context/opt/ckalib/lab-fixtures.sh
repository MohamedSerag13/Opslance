#!/bin/bash
# Week 7 fixtures: everything in ns broken is broken on purpose
set -e
kubectl create ns broken --dry-run=client -o yaml | kubectl apply -f - >/dev/null
kubectl -n broken get deploy ipull >/dev/null 2>&1 || kubectl -n broken create deploy ipull --image=nginx:1.27-nope --replicas=1
kubectl -n broken get deploy crashy >/dev/null 2>&1 || kubectl -n broken create deploy crashy --image=busybox:1.36 --replicas=1 -- sh -c "exit 1"
kubectl -n broken get deploy huge >/dev/null 2>&1 || { kubectl -n broken create deploy huge --image=nginx:1.27 --replicas=1; kubectl -n broken patch deploy huge -p="{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"nginx\",\"resources\":{\"requests\":{\"cpu\":\"500\"}}}]}}}}"; }
kubectl -n broken get deploy zero-dep >/dev/null 2>&1 || kubectl -n broken create deploy zero-dep --image=nginx:1.27 --replicas=0
kubectl -n broken get deploy web >/dev/null 2>&1 || kubectl -n broken create deploy web --image=nginx:1.27 --replicas=2
kubectl -n broken label deploy web app=web --overwrite
kubectl -n broken get deploy tester >/dev/null 2>&1 || kubectl -n broken create deploy tester --image=busybox:1.36 --replicas=1 -- sleep 3600
kubectl -n broken get svc broken-svc >/dev/null 2>&1 || { kubectl -n broken expose deploy web --port=80 --name=broken-svc; kubectl -n broken patch svc broken-svc -p="{\"spec\":{\"ports\":[{\"port\":80,\"targetPort\":8080}]}}"; }
if ! kubectl -n broken get svc no-ep-svc >/dev/null 2>&1; then
cat <<'YAML' | kubectl apply -f - >/dev/null
apiVersion: v1
kind: Service
metadata:
  name: no-ep-svc
  namespace: broken
spec:
  selector:
    app: nope
  ports:
  - port: 80
    targetPort: 80
YAML
fi
if ! kubectl -n broken get pod oom >/dev/null 2>&1; then
cat <<'YAML' | kubectl apply -f - >/dev/null
apiVersion: v1
kind: Pod
metadata:
  name: oom
  namespace: broken
spec:
  restartPolicy: Always
  containers:
  - name: oom
    image: nginx:1.27
    resources:
      limits:
        memory: 5Mi
YAML
fi
if ! kubectl -n broken get pod env-app >/dev/null 2>&1; then
cat <<'YAML' | kubectl apply -f - >/dev/null
apiVersion: v1
kind: Pod
metadata:
  name: env-app
  namespace: broken
spec:
  restartPolicy: Always
  containers:
  - name: app
    image: busybox:1.36
    command: ["sh","-c","[ "$GREETING" = "hello" ] && sleep 3600 || exit 1"]
YAML
fi
kubectl -n broken get pvc stuck-sc >/dev/null 2>&1 || { printf "apiVersion: v1\nkind: PersistentVolumeClaim\nmetadata:\n  name: stuck-sc\n  namespace: broken\nspec:\n  accessModes:\n  - ReadWriteOnce\n  resources:\n    requests:\n      storage: 300Mi\n  storageClassName: missing-sc\n" | kubectl apply -f - >/dev/null; }
kubectl -n broken get job bad-job >/dev/null 2>&1 || kubectl -n broken create job bad-job --image=busybox:1.36 -- sh -c "exit 1"
kubectl -n broken get secret app-conf >/dev/null 2>&1 || kubectl -n broken create secret generic app-conf --from-literal=password=s3cr3t
if ! kubectl -n broken get pod sec-reader >/dev/null 2>&1; then
cat <<'YAML' | kubectl apply -f - >/dev/null
apiVersion: v1
kind: Pod
metadata:
  name: sec-reader
  namespace: broken
spec:
  restartPolicy: Always
  containers:
  - name: reader
    image: busybox:1.36
    command: ["sh","-c","cat /creds/password && sleep 3600"]
    volumeMounts:
    - name: creds
      mountPath: /creds
  volumes:
  - name: creds
    secret:
      secretName: app-conf
      items:
      - key: password
        path: pass
YAML
fi
if ! kubectl -n broken get ingress broken-ing >/dev/null 2>&1; then
cat <<'YAML' | kubectl apply -f - >/dev/null
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: broken-ing
  namespace: broken
spec:
  rules:
  - host: broken.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: no-such-svc
            port:
              number: 80
YAML
fi
kubectl -n broken get netpol deny-all >/dev/null 2>&1 || { printf "apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: deny-all\n  namespace: broken\nspec:\n  podSelector: {}\n  policyTypes:\n  - Ingress\n" | kubectl apply -f - >/dev/null; }
if ! kubectl get ns ingress-nginx >/dev/null 2>&1; then
  kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.2/deploy/static/provider/baremetal/deploy.yaml >/dev/null 2>&1 || echo "[fixtures] WARNING: ingress-nginx install failed"
fi
echo "[fixtures] 12 broken scenarios seeded in ns broken (netpol is active: expect failures until you fix them)"
