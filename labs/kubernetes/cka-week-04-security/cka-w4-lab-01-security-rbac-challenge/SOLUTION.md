# CKA Week 4 Challenge - RBAC, Certificates, Security Contexts — Solution

### Task 1 — ServiceAccount dev-sa exists in ns dev
```bash
kubectl -n dev create sa dev-sa
```

### Task 2 — Role pods-reader in dev allows get,list,watch on pods
```bash
kubectl -n dev create role pods-reader --verb=get,list,watch --resource=pods
```

### Task 3 — RoleBinding pods-reader-binding binds pods-reader to SA dev:dev-sa
```bash
kubectl -n dev create rolebinding pods-reader-binding --role=pods-reader --serviceaccount=dev:dev-sa
```

### Task 4 — auth can-i: the SA CAN list pods in dev
```bash
kubectl -n dev auth can-i list pods --as=system:serviceaccount:dev:dev-sa  # must print yes
```

### Task 5 — auth can-i: the SA CANNOT delete pods in dev (least privilege)
```bash
kubectl -n dev auth can-i delete pods --as=system:serviceaccount:dev:dev-sa  # must print no
```

### Task 6 — ClusterRole node-reader allows get,list,watch on nodes
```bash
kubectl create clusterrole node-reader --verb=get,list,watch --resource=nodes
```

### Task 7 — ClusterRoleBinding grants node-reader to dev-sa; can-i get nodes -> yes
```bash
kubectl create clusterrolebinding node-reader-binding --clusterrole=node-reader --serviceaccount=dev:dev-sa; kubectl auth can-i get nodes --as=system:serviceaccount:dev:dev-sa
```

### Task 8 — CSR jane-csr Approved with certificate issued
```bash
openssl genrsa -out jane.key 2048; openssl req -new -key jane.key -subj "/CN=jane" -out jane.csr; CAT=$(base64 -w0 jane.csr); kubectl apply -f - <<EOF ... kind: CertificateSigningRequest, signerName: kubernetes.io/kube-apiserver-client, usages: [client auth] ... EOF; kubectl certificate approve jane-csr
```

### Task 9 — /home/intern/jane.kubeconfig authenticates jane (can-i prints no)
```bash
kubectl get csr jane-csr -o jsonpath="{.status.certificate}" | base64 -d > jane.crt; kubectl config set-cluster cka --server=https://k3s-server:6443 --certificate-authority=/etcd-tls/etcd/ca.crt --embed-certs=true --kubeconfig=/home/intern/jane.kubeconfig; kubectl config set-credentials jane --client-certificate=jane.crt --client-key=jane.key --embed-certs=true --kubeconfig=/home/intern/jane.kubeconfig; kubectl config set-context jane --cluster=cka --user=jane --kubeconfig=/home/intern/jane.kubeconfig; kubectl config use-context jane --kubeconfig=/home/intern/jane.kubeconfig
```

### Task 10 — Pod sc-pod runs as non-root (runAsNonRoot=true, runAsUser=1000)
```bash
kubectl -n dev run sc-pod --image=nginx:1.27 $do > sc.yaml; vim sc.yaml  # spec.securityContext: {runAsNonRoot: true, runAsUser: 1000}; apply
```

### Task 11 — Pod sc-pod drops ALL capabilities and adds NET_BIND_SERVICE
```bash
vim sc.yaml  # container securityContext: {capabilities: {drop: [ALL], add: [NET_BIND_SERVICE]}}; kubectl apply -f sc.yaml
```

### Task 12 — ns secure enforces PSA baseline; a hostPath pod is rejected there
```bash
kubectl label ns secure pod-security.kubernetes.io/enforce=baseline; printf "apiVersion: v1\nkind: Pod\nmetadata:\n  name: unsafe\n  namespace: secure\nspec:\n  containers:\n  - name: c\n    image: busybox:1.36\n    volumeMounts:\n    - name: h\n      mountPath: /host\n  volumes:\n  - name: h\n    hostPath:\n      path: /etc\n" | kubectl apply -f -  # must be denied
```
