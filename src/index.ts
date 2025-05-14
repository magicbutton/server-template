import dotenv from 'dotenv';
import { Server } from './server';
import { WebSocketTransport } from './transport/websocket-transport';
import { HttpTransport } from './transport/http-transport';

// Load environment variables
dotenv.config();

export * from './types';
export * from './server';
export * from './transport/http-transport';
export * from './transport/websocket-transport';

/**
 * Creates a WebSocket server instance
 */
export function createWebSocketServer(port: number = 3001): Server {
  const transport = new WebSocketTransport({ port });
  return new Server(transport);
}

/**
 * Creates an HTTP server instance
 */
export function createHttpServer(port: number = 3000): Server {
  const transport = new HttpTransport({ port });
  return new Server(transport);
}

/**
 * Example usage
 */
if (require.main === module) {
  async function main() {
    try {
      // Create a WebSocket server
      const wsServer = createWebSocketServer();
      await wsServer.initialize();
      console.log('WebSocket server initialized');
      
      // Create an HTTP server
      const httpServer = createHttpServer();
      await httpServer.initialize();
      console.log('HTTP server initialized');
      
      // Register example request handler
      wsServer.registerRequestHandler('request.echo', async (message) => {
        return {
          id: message.id,
          type: 'response.echo',
          payload: message.payload,
          timestamp: Date.now(),
          context: message.context
        };
      });
      
      // Register example event handler
      wsServer.registerEventHandler('event.notification', async (message, clientId) => {
        console.log(`Received notification from client ${clientId}:`, message.payload);
      });
      
      // Handle shutdown
      process.on('SIGINT', async () => {
        console.log('Shutting down servers...');
        await wsServer.shutdown();
        await httpServer.shutdown();
        process.exit(0);
      });
    } catch (error) {
      console.error('Error starting servers:', error);
      process.exit(1);
    }
  }
  
  main();
}