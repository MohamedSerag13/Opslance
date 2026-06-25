#!/usr/bin/env python3
"""
gatekeeper.py — Lab 04 fake-firewall proxy for Opslance
========================================================

Listens on LISTEN_PORT (default 8080) and forwards connections to
BACKEND_PORT (default 8888) on localhost — but only if the fake-ufw
rules currently permit it.

Firewall enforcement logic:
  - Connections from 127.0.0.1 (loopback): ALWAYS forwarded, regardless
    of fake-ufw state. This ensures 'curl localhost:8080' always works
    inside the server container for local debugging.
  - Connections from any other peer (e.g. the client container): allowed
    only if the fake-ufw rules file contains an ALLOW rule for LISTEN_PORT.
    If the rule is DENY or absent, the connection is refused immediately.

This faithfully simulates the "works locally, blocked remotely" pattern
that real iptables/ufw produces — without needing NET_ADMIN or real
kernel-level netfilter.

Rules file format (matches fakeufw.sh output):
  8080                           ALLOW      Anywhere
  8080                           DENY       Anywhere
"""

import socket
import threading
import os
import sys
import select

LISTEN_HOST = "0.0.0.0"
LISTEN_PORT = int(os.environ.get("GATEKEEPER_LISTEN_PORT", "8080"))
BACKEND_PORT = int(os.environ.get("GATEKEEPER_BACKEND_PORT", "8888"))
RULES_FILE   = os.environ.get("FAKEUFW_RULES_FILE", "/var/lib/fakeufw/rules")
LOOPBACK     = "127.0.0.1"


def is_port_allowed(port: int) -> bool:
    """
    Return True if the fake-ufw rules file has an ALLOW rule for `port`,
    False if it has a DENY rule or no rule at all.
    """
    try:
        with open(RULES_FILE, "r") as f:
            for line in f:
                parts = line.split()
                if len(parts) >= 2:
                    rule_port = parts[0].split("/")[0]  # strip /tcp etc.
                    rule_action = parts[1].upper()
                    if rule_port == str(port):
                        return rule_action == "ALLOW"
    except FileNotFoundError:
        pass
    # No matching rule → deny by default (mirrors ufw default-deny)
    return False


def forward(src: socket.socket, dst: socket.socket):
    """Bidirectionally forward data between two sockets until one closes."""
    try:
        while True:
            r, _, _ = select.select([src, dst], [], [], 1.0)
            if not r:
                continue
            for s in r:
                other = dst if s is src else src
                try:
                    data = s.recv(4096)
                    if not data:
                        return
                    other.sendall(data)
                except OSError:
                    return
    finally:
        for s in (src, dst):
            try:
                s.close()
            except OSError:
                pass


def handle_client(client_sock: socket.socket, peer_ip: str):
    # Loopback is always allowed (local debugging)
    if peer_ip == LOOPBACK:
        allowed = True
    else:
        allowed = is_port_allowed(LISTEN_PORT)

    if not allowed:
        print(f"[gatekeeper] BLOCKED {peer_ip}:{LISTEN_PORT} — fake-ufw DENY rule active")
        try:
            # Send a minimal HTTP 403 so curl gets a readable error
            client_sock.sendall(
                b"HTTP/1.1 403 Forbidden\r\n"
                b"Content-Type: text/plain\r\n"
                b"Connection: close\r\n\r\n"
                b"Access denied by firewall rule (ufw DENY 8080).\n"
                b"Fix: run 'sudo ufw allow 8080' on the server, then retry.\n"
            )
            # Graceful shutdown — send FIN so the client reads EOF instead of
            # getting a TCP RST (which causes curl: (56) Recv failure: Connection
            # reset by peer).
            try:
                client_sock.shutdown(socket.SHUT_WR)
            except OSError:
                pass
        finally:
            client_sock.close()
        return

    # Allowed — connect to the backend and forward
    try:
        backend_sock = socket.create_connection((LOOPBACK, BACKEND_PORT), timeout=5)
    except OSError as exc:
        print(f"[gatekeeper] ERROR connecting to backend :{BACKEND_PORT}: {exc}")
        client_sock.close()
        return

    print(f"[gatekeeper] ALLOWED {peer_ip} → localhost:{BACKEND_PORT}")
    t = threading.Thread(target=forward, args=(client_sock, backend_sock), daemon=True)
    t.start()


def main():
    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind((LISTEN_HOST, LISTEN_PORT))
    srv.listen(64)
    print(f"[gatekeeper] Listening on {LISTEN_HOST}:{LISTEN_PORT} → localhost:{BACKEND_PORT}")
    print(f"[gatekeeper] Rules file: {RULES_FILE}")
    print(f"[gatekeeper] Loopback ({LOOPBACK}) is always allowed.")
    sys.stdout.flush()

    while True:
        try:
            client_sock, (peer_ip, peer_port) = srv.accept()
            t = threading.Thread(
                target=handle_client,
                args=(client_sock, peer_ip),  # pass ip string directly
                daemon=True
            )
            t.start()
        except KeyboardInterrupt:
            print("[gatekeeper] Shutting down.")
            break
        except OSError as exc:
            print(f"[gatekeeper] Accept error: {exc}")


if __name__ == "__main__":
    main()
