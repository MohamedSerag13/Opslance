FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive \
    KUBECONFIG=/kube/config

RUN apt-get update && apt-get install -y --no-install-recommends \
      bash-completion ca-certificates curl dnsutils etcd-client iproute2 \
      iputils-ping jq less nano netcat-openbsd openssl procps sudo vim \
    && rm -rf /var/lib/apt/lists/*

# kubectl pinned to the k3s Kubernetes version; helm for the week-6/8 labs
# dpkg --print-architecture always matches the image arch, even when the
# legacy docker-compose v1 builder leaves TARGETARCH at its amd64 default
RUN ARCH=$(dpkg --print-architecture) \
    && curl -fsSLo /usr/local/bin/kubectl \
      https://dl.k8s.io/release/v1.31.2/bin/linux/${ARCH}/kubectl \
    && chmod +x /usr/local/bin/kubectl \
    && curl -fsSL https://get.helm.sh/helm-v3.16.3-linux-${ARCH}.tar.gz \
       | tar -xz -C /tmp \
    && mv /tmp/linux-${ARCH}/helm /usr/local/bin/helm \
    && chmod +x /usr/local/bin/helm

RUN useradd -m -s /bin/bash intern && echo "intern:intern123" | chpasswd

RUN mkdir -p /kube /opt/ckalib && printf '' > /kube/config

COPY bootstrap.sh /usr/local/bin/cka-bootstrap
COPY check.sh /check.sh
COPY check_lib.sh /opt/ckalib/check_lib.sh
RUN chmod +x /usr/local/bin/cka-bootstrap /check.sh /opt/ckalib/check_lib.sh

COPY context/ /
RUN chown -R intern:intern /home/intern
RUN grep -qxF "#includedir /etc/sudoers.d" /etc/sudoers || echo "#includedir /etc/sudoers.d" >> /etc/sudoers

ENTRYPOINT ["cka-bootstrap"]
