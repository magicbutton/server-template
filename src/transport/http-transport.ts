import express from 'express';
import http from 'http';
import cors from 'cors';
import { TransportAdapter, Client, Message } from '../types';

export interface HttpTransportOptions {
  port: number;
  corsOptions?: cors.CorsOptions;
}

export class HttpTransport implements TransportAdapter {
  private options: HttpTransportOptions;
  private app: express.Express;
  private server: http.Server | null = null;
  private clients: Map<string, Client> = new Map();
  private clientConnectCallbacks: Array<(client: Client) => void> = [];
  private clientDisconnectCallbacks: Array<(clientId: string) => void> = [];
  private messageCallbacks: Array<(message: Message, clientId: string) => void> = [];

  constructor(options: HttpTransportOptions) {
    this.options = options;
    this.app = express();
    
    this.app.use(express.json());
    this.app.use(cors(this.options.corsOptions));
  }

  public async initialize(): Promise<void> {
    this.app.post('/connect', (req, res) => {
      const clientId = req.body.clientId || `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      const client: Client = {
        id: clientId,
        send: async (message: Message) => {
          // Messages will be fetched by the client via polling /messages endpoint
          // We'll store them temporarily and clear them when fetched
          return Promise.resolve();
        }
      };
      
      this.clients.set(clientId, client);
      this.clientConnectCallbacks.forEach(callback => callback(client));
      
      res.json({ clientId });
    });
    
    this.app.post('/disconnect', (req, res) => {
      const { clientId } = req.body;
      
      if (this.clients.has(clientId)) {
        this.clients.delete(clientId);
        this.clientDisconnectCallbacks.forEach(callback => callback(clientId));
      }
      
      res.status(200).end();
    });
    
    this.app.post('/message', (req, res) => {
      const { clientId, message } = req.body;
      
      if (!this.clients.has(clientId)) {
        return res.status(404).json({ error: 'Client not found' });
      }
      
      // Process the message asynchronously
      this.messageCallbacks.forEach(callback => callback(message, clientId));
      
      res.status(202).end();
    });
    
    return new Promise<void>((resolve) => {
      this.server = this.app.listen(this.options.port, () => {
        console.log(`HTTP Transport listening on port ${this.options.port}`);
        resolve();
      });
    });
  }

  public async shutdown(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.server) {
        return resolve();
      }
      
      this.server.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
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