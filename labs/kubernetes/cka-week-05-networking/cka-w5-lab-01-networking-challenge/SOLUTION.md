# CKA Week 5 Challenge - Services, DNS, Ingress, NetworkPolicy — Solution

### Task 1 — Service web-a-svc (ClusterIP 80) in apps has ready endpoints
```bash
kubectl -n apps expose deploy web-a --port=80 --name=web-a-svc
```

### Task 2 — Service web-a-np in apps is a NodePort
```bash
kubectl -n apps expose deploy web-a --port=80 --name=web-a-np --type=NodePort
```

### Task 3 — Headless Service web-a-headless in apps (clusterIP: None)
```bash
kubectl -n apps expose deploy web-a --port=80 --name=web-a-headless $do > h.yaml; sed -i "s|clusterIP: 10|clusterIP: None|" h.yaml  # or edit; apply
```

### Task 4 — ExternalName Service external-db points to db.example.com
```bash
kubectl -n apps create svc externalname external-db --external-name=db.example.com
```

### Task 5 — Cluster DNS resolves web-a-svc.apps.svc.cluster.local from a pod
```bash
kubectl -n apps run dns-verify --image=busybox:1.36 --rm -i --restart=Never -- nslookup web-a-svc.apps.svc.cluster.local  # FQDN format: <svc>.<ns>.svc.cluster.local
```

### Task 6 — Ingress app-ingress routes app.example.com to web-a-svc (verified with curl)
```bash
kubectl -n apps create ingress app-ingress --rule="app.example.com/*=web-a-svc:80"; curl -s -H "Host: app.example.com" "http://k3s-server:$(kubectl -n ingress-nginx get svc ingress-nginx-controller -o jsonpath='{.spec.ports[?(@.port==80)].nodePort}')/"
```

### Task 7 — Second virtual host api.example.com routes to web-b-svc (curl shows the httpd page)
```bash
kubectl -n apps create ingress api-ingress --rule="api.example.com/*=web-b-svc:80"; curl -s -H "Host: api.example.com" "http://k3s-server:$(kubectl -n ingress-nginx get svc ingress-nginx-controller -o jsonpath='{.spec.ports[?(@.port==80)].nodePort}')/"
```

### Task 8 — TLS ingress: secret app-tls serves https for app.example.com (curl -k)
```bash
openssl req -x509 -nodes -newkey rsa:2048 -keyout tls.key -out tls.crt -subj "/CN=app.example.com" -days 365; kubectl -n apps create secret tls app-tls --cert=tls.crt --key=tls.key; kubectl -n apps patch ingress app-ingress  # add spec.tls: [{hosts: [app.example.com], secretName: app-tls}]
```

### Task 9 — NetworkPolicy default-deny in secure: client CANNOT reach protected (live traffic)
```bash
kubectl -n secure apply -f - <<EOF  # policyTypes: [Ingress], podSelector: {}, no ingress rules = deny all ingress
```

### Task 10 — Allow rule: client2 (label access=allowed) CAN reach protected
```bash
kubectl -n secure apply -f - <<EOF  # second policy: podSelector app=protected, ingress from podSelector access=allowed on port 80
```

### Task 11 — DNS egress preserved: client can still resolve kubernetes.default
```bash
# add an egress policy allowing UDP/TCP 53 to kube-dns: egress: - ports: [{protocol: UDP, port: 53}, {protocol: TCP, port: 53}]
```

### Task 12 — Gateway API: a Gateway and an HTTPRoute exist (class cka-gc)
```bash
kubectl apply -f - <<EOF  # kind: Gateway, gatewayClassName: cka-gc, listener http on port 80; then HTTPRoute to web-a-svc
```
