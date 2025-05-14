import { 
  TransportAdapter, 
  Message, 
  RequestHandler, 
  EventHandler,
  Middleware
} from './types';
import logger from './lib/logger';
import { config } from './config';

export interface ServerOptions {
  transportAdapter: TransportAdapter;
  middleware?: Middleware[];
  gracefulShutdownTimeout?: number;
  corsEnabled?: boolean;
  developmentMode?: boolean;
}

export class Server {
  private transportAdapter: TransportAdapter;
  private requestHandlers: Map<string, RequestHandler> = new Map();
  private eventHandlers: Map<string, EventHandler[]> = new Map();
  private middleware: Middleware[] = [];
  private clients: Set<string> = new Set();
  private gracefulShutdownTimeout: number;
  private isShuttingDown: boolean = false;
  private developmentMode: boolean;

  constructor(options: ServerOptions) {
    this.transportAdapter = options.transportAdapter;
    this.middleware = options.middleware || [];
    this.gracefulShutdownTimeout = options.gracefulShutdownTimeout || 5000;
    this.developmentMode = options.developmentMode || config.server.env === 'development';
    
    if (this.developmentMode) {
      logger.info('Server running in development mode');
      this.setupHotReloading();
    }
  }

  private setupHotReloading(): void {
    // This is a placeholder for HMR setup
    // In real implementation, we would attach file watchers or use ts-node-dev hooks
    logger.debug('Hot Module Replacement (HMR) enabled');
    
    // Example for handling HMR in Node.js
    if (module.hot) {
      module.hot.accept();
      module.hot.dispose(() => {
        logger.info('HMR: Module disposed, preparing for reload...');
      });
    }
  }

  public async initialize(): Promise<void> {
    logger.info('Initializing server...');
    
    try {
      await this.transportAdapter.initialize();
      
      this.transportAdapter.onClientConnect(client => {
        this.clients.add(client.id);
        logger.info(`Client connected: ${client.id}`);
      });
  
      this.transportAdapter.onClientDisconnect(clientId => {
        this.clients.delete(clientId);
        logger.info(`Client disconnected: ${clientId}`);
      });
  
      this.transportAdapter.onMessage(async (message, clientId) => {
        if (this.isShuttingDown) {
          logger.warn(`Ignoring message from ${clientId} as server is shutting down`);
          return;
        }
        
        try {
          if (message.type.startsWith('request.')) {
            const response = await this.handleRequest(message, clientId);
            await this.transportAdapter.sendToClient(clientId, response);
          } else if (message.type.startsWith('event.')) {
            await this.handleEvent(message, clientId);
          }
        } catch (error) {
          logger.error('Error handling message:', error);
          
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
      
      logger.info('Server initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize server:', error);
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress');
      return;
    }
    
    this.isShuttingDown = true;
    logger.info(`Shutting down server (timeout: ${this.gracefulShutdownTimeout}ms)...`);
    
    // Send notification to all clients
    const shutdownMessage: Message = {
      id: `shutdown-${Date.now()}`,
      type: 'system.shutdown',
      payload: {
        reason: 'Server is shutting down',
        reconnectIn: 10000 // Suggest clients to reconnect in 10 seconds
      },
      timestamp: Date.now()
    };
    
    try {
      // Broadcast shutdown message to all clients
      await this.broadcast(shutdownMessage);
      
      // Give clients some time to process the shutdown message
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Shutdown the transport adapter
      await Promise.race([
        this.transportAdapter.shutdown(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transport shutdown timeout')), this.gracefulShutdownTimeout)
        )
      ]);
      
      logger.info('Server shutdown completed');
    } catch (error) {
      logger.error('Error during shutdown:', error);
      // Force shutdown after timeout
    }
  }

  public registerRequestHandler(type: string, handler: RequestHandler): void {
    if (this.requestHandlers.has(type)) {
      throw new Error(`Request handler for type '${type}' already registered`);
    }
    logger.debug(`Registering request handler for type: ${type}`);
    this.requestHandlers.set(type, handler);
  }

  public registerEventHandler(type: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, []);
    }
    logger.debug(`Registering event handler for type: ${type}`);
    this.eventHandlers.get(type)?.push(handler);
  }

  public use(middleware: Middleware): void {
    logger.debug('Adding middleware to server');
    this.middleware.push(middleware);
  }

  public async broadcast(message: Message): Promise<void> {
    logger.debug(`Broadcasting message of type: ${message.type}`);
    await this.transportAdapter.broadcast(message);
  }

  public getStatus(): Record<string, any> {
    return {
      clients: this.clients.size,
      requestHandlers: Array.from(this.requestHandlers.keys()),
      eventHandlerTypes: Array.from(this.eventHandlers.keys()),
      middlewareCount: this.middleware.length,
      shutdownInProgress: this.isShuttingDown,
      developmentMode: this.developmentMode
    };
  }

  private async handleRequest(message: Message, clientId: string): Promise<Message> {
    const handler = this.requestHandlers.get(message.type);
    
    if (!handler) {
      logger.warn(`No handler registered for request type '${message.type}'`);
      throw new Error(`No handler registered for request type '${message.type}'`);
    }

    logger.debug(`Handling request of type '${message.type}' from client '${clientId}'`);
    let response: Message | void = undefined;
    
    const executeMiddleware = async (index: number): Promise<Message | void> => {
      if (index >= this.middleware.length) {
        return handler(message, clientId);
      }
      
      return this.middleware[index](message, clientId, () => executeMiddleware(index + 1));
    };
    
    response = await executeMiddleware(0);
    
    if (!response) {
      logger.error(`Request handler for '${message.type}' did not return a response`);
      throw new Error('Request handler did not return a response');
    }
    
    return response;
  }

  private async handleEvent(message: Message, clientId: string): Promise<void> {
    const handlers = this.eventHandlers.get(message.type) || [];
    
    if (handlers.length === 0) {
      logger.debug(`No handlers registered for event type '${message.type}'`);
      return;
    }
    
    logger.debug(`Handling event of type '${message.type}' from client '${clientId}'`);
    
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