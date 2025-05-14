import { z } from 'zod';

export const MessageSchema = z.object({
  id: z.string(),
  type: z.string(),
  payload: z.any(),
  timestamp: z.number(),
  context: z.object({
    auth: z.object({
      userId: z.string().optional(),
      roles: z.array(z.string()).optional()
    }).optional(),
    tracing: z.object({
      requestId: z.string().optional(),
      parentId: z.string().optional()
    }).optional()
  }).optional()
});

export type Message = z.infer<typeof MessageSchema>;

export interface Client {
  id: string;
  send: (message: Message) => Promise<void>;
}

export interface TransportAdapter {
  initialize: () => Promise<void>;
  shutdown: () => Promise<void>;
  broadcast: (message: Message) => Promise<void>;
  sendToClient: (clientId: string, message: Message) => Promise<void>;
  onClientConnect: (callback: (client: Client) => void) => void;
  onClientDisconnect: (callback: (clientId: string) => void) => void;
  onMessage: (callback: (message: Message, clientId: string) => void) => void;
}

export interface RequestHandler {
  (message: Message, clientId: string): Promise<Message>;
}

export interface EventHandler {
  (message: Message, clientId: string): Promise<void>;
}

export interface Middleware {
  (message: Message, clientId: string, next: () => Promise<Message | void>): Promise<Message | void>;
}