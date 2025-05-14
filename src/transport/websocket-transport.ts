import http from 'http';
import WebSocket from 'ws';
import { TransportAdapter, Client, Message } from '../types';

export interface WebSocketTransportOptions {
  port: number;
}

export class WebSocketTransport implements TransportAdapter {
  private options: WebSocketTransportOptions;
  private server: http.Server | null = null;
  private wss: WebSocket.Server | null = null;
  private clients: Map<string, Client> = new Map();
  private socketToClientId: Map<WebSocket, string> = new Map();
  private clientConnectCallbacks: Array<(client: Client) => void> = [];
  private clientDisconnectCallbacks: Array<(clientId: string) => void> = [];
  private messageCallbacks: Array<(message: Message, clientId: string) => void> = [];

  constructor(options: WebSocketTransportOptions) {
    this.options = options;
  }

  public async initialize(): Promise<void> {
    this.server = http.createServer();
    this.wss = new WebSocket.Server({ server: this.server });
    
    this.wss.on('connection', (ws) => {
      const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      const client: Client = {
        id: clientId,
        send: async (message: Message) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
          }
          return Promise.resolve();
        }
      };
      
      this.clients.set(clientId, client);
      this.socketToClientId.set(ws, clientId);
      this.clientConnectCallbacks.forEach(callback => callback(client));
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString()) as Message;
          this.messageCallbacks.forEach(callback => callback(message, clientId));
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });
      
      ws.on('close', () => {
        if (this.socketToClientId.has(ws)) {
          const clientId = this.socketToClientId.get(ws)!;
          this.clients.delete(clientId);
          this.socketToClientId.delete(ws);
          this.clientDisconnectCallbacks.forEach(callback => callback(clientId));
        }
      });
    });
    
    return new Promise<void>((resolve) => {
      this.server!.listen(this.options.port, () => {
        console.log(`WebSocket Transport listening on port ${this.options.port}`);
        resolve();
      });
    });
  }

  public async shutdown(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.wss) {
        this.wss.close((err) => {
          if (err) {
            reject(err);
          } else if (this.server) {
            this.server.close((err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  public async broadcast(message: Message): Promise<void> {
    const promises = Array.from(this.clients.keys()).map(clientId => 
      this.sendToClient(clientId, message)
    );
    
    await Promise.all(promises);
  }

  public async sendToClient(clientId: string, message: Message): Promise<void> {
    const client = this.clients.get(clientId);
    
    if (!client) {
      throw new Error(`Client with ID '${clientId}' not found`);
    }
    
    await client.send(message);
  }

  public onClientConnect(callback: (client: Client) => void): void {
    this.clientConnectCallbacks.push(callback);
  }

  public onClientDisconnect(callback: (clientId: string) => void): void {
    this.clientDisconnectCallbacks.push(callback);
  }

  public onMessage(callback: (message: Message, clientId: string) => void): void {
    this.messageCallbacks.push(callback);
  }
}