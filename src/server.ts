import { 
  TransportAdapter, 
  Message, 
  RequestHandler, 
  EventHandler,
  Middleware
} from './types';

export class Server {
  private transportAdapter: TransportAdapter;
  private requestHandlers: Map<string, RequestHandler> = new Map();
  private eventHandlers: Map<string, EventHandler[]> = new Map();
  private middleware: Middleware[] = [];
  private clients: Set<string> = new Set();

  constructor(transportAdapter: TransportAdapter) {
    this.transportAdapter = transportAdapter;
  }

  public async initialize(): Promise<void> {
    await this.transportAdapter.initialize();
    
    this.transportAdapter.onClientConnect(client => {
      this.clients.add(client.id);
      console.log(`Client connected: ${client.id}`);
    });

    this.transportAdapter.onClientDisconnect(clientId => {
      this.clients.delete(clientId);
      console.log(`Client disconnected: ${clientId}`);
    });

    this.transportAdapter.onMessage(async (message, clientId) => {
      try {
        if (message.type.startsWith('request.')) {
          const response = await this.handleRequest(message, clientId);
          await this.transportAdapter.sendToClient(clientId, response);
        } else if (message.type.startsWith('event.')) {
          await this.handleEvent(message, clientId);
        }
      } catch (error) {
        console.error('Error handling message:', error);
        
        const errorResponse: Message = {
          id: message.id,
          type: `error.${message.type}`,
          payload: {
            message: error instanceof Error ? error.message : 'Unknown error',
            code: 'INTERNAL_ERROR'
          },
          timestamp: Date.now(),
          context: message.context
        };
        
        await this.transportAdapter.sendToClient(clientId, errorResponse);
      }
    });
  }

  public async shutdown(): Promise<void> {
    await this.transportAdapter.shutdown();
  }

  public registerRequestHandler(type: string, handler: RequestHandler): void {
    if (this.requestHandlers.has(type)) {
      throw new Error(`Request handler for type '${type}' already registered`);
    }
    this.requestHandlers.set(type, handler);
  }

  public registerEventHandler(type: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, []);
    }
    this.eventHandlers.get(type)?.push(handler);
  }

  public use(middleware: Middleware): void {
    this.middleware.push(middleware);
  }

  public async broadcast(message: Message): Promise<void> {
    await this.transportAdapter.broadcast(message);
  }

  private async handleRequest(message: Message, clientId: string): Promise<Message> {
    const handler = this.requestHandlers.get(message.type);
    
    if (!handler) {
      throw new Error(`No handler registered for request type '${message.type}'`);
    }

    let response: Message | void = undefined;
    
    const executeMiddleware = async (index: number): Promise<Message | void> => {
      if (index >= this.middleware.length) {
        return handler(message, clientId);
      }
      
      return this.middleware[index](message, clientId, () => executeMiddleware(index + 1));
    };
    
    response = await executeMiddleware(0);
    
    if (!response) {
      throw new Error('Request handler did not return a response');
    }
    
    return response;
  }

  private async handleEvent(message: Message, clientId: string): Promise<void> {
    const handlers = this.eventHandlers.get(message.type) || [];
    
    const executeMiddleware = async (index: number): Promise<void> => {
      if (index >= this.middleware.length) {
        await Promise.all(handlers.map(handler => handler(message, clientId)));
        return;
      }
      
      await this.middleware[index](message, clientId, () => executeMiddleware(index + 1));
    };
    
    await executeMiddleware(0);
  }
}