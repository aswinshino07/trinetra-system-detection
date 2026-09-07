import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

export class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  public init(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      // Send initial welcome
      ws.send(JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() }));

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', (err) => {
        console.error('WS client error:', err);
        this.clients.delete(ws);
      });
    });
  }

  public broadcast(type: string, data: any) {
    const payload = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(payload);
        } catch (err) {
          // ignore closed socket errors
        }
      }
    }
  }

  public getClientCount(): number {
    return this.clients.size;
  }
}

export const wsManager = new WebSocketManager();
