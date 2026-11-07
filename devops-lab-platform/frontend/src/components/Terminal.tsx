import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useAuthStore } from '../store/authStore';
import { fetchWsTicket } from '../api/client';

export default function Terminal({ sessionId }: { sessionId: string }) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { token } = useAuthStore();

  useEffect(() => {
    if (!terminalRef.current || !token) return;

    const xterm = new XTerm({
      cursorBlink: true,
      theme: {
        background: '#1e1e1e',
      },
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);

    xterm.open(terminalRef.current);
    fitAddon.fit();
    xtermRef.current = xterm;

    let disposed = false;
    const cleanupFns: Array<() => void> = [];

    // Auth: the long-lived JWT never goes into the WS URL. It is exchanged
    // for a one-time 30s ticket over an authenticated REST call first.
    (async () => {
      let ticket: string;
      try {
        ticket = await fetchWsTicket('terminal', sessionId);
      } catch {
        if (!disposed) xterm.write('\r\n*** Could not authorize the terminal session ***\r\n');
        return;
      }
      if (disposed) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/ws/terminal/${sessionId}?ticket=${ticket}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        xterm.write('\r\n*** Connected to Terminal ***\r\n');
      };

      ws.onmessage = (event) => {
        xterm.write(event.data);
      };

      ws.onclose = () => {
        xterm.write('\r\n*** Disconnected from Terminal ***\r\n');
      };

      xterm.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      const handleResize = () => {
        fitAddon.fit();
        if (ws.readyState === WebSocket.OPEN) {
          // ws.send(JSON.stringify({ type: 'resize', cols: xterm.cols, rows: xterm.rows }));
        }
      };

      window.addEventListener('resize', handleResize);
      cleanupFns.push(() => window.removeEventListener('resize', handleResize));
    })();

    return () => {
      disposed = true;
      cleanupFns.forEach((fn) => fn());
      wsRef.current?.close();
      xterm.dispose();
    };
  }, [sessionId, token]);

  return <div ref={terminalRef} className="w-full h-full bg-[#1e1e1e] p-2" />;
}
