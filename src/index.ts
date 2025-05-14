import { Server } from './server';
import { config } from './config';
import { inventoryContract } from './contracts/inventory-contract';
import { registerInventoryHandlers } from './handlers/inventory-handlers';
import { setupObservability } from './lib/observability';
import { setupAuth } from './lib/auth';
import logger from './lib/logger';
import { HttpTransport } from './transport/http-transport';
import { WebSocketTransport } from './transport/websocket-transport';

// Process termination signals
function setupProcessHandlers(server: Server) {
  // Handle normal exit
  process.on('exit', () => {
    logger.info('Process exit signal received');
  });

  // Handle CTRL+C
  process.on('SIGINT', async () => {
    logger.info('SIGINT signal received');
    await gracefulShutdown(server);
  });

  // Handle nodemon/ts-node-dev restarts
  process.once('SIGUSR2', async () => {
    logger.info('SIGUSR2 signal received (dev reload)');
    await gracefulShutdown(server);
    process.kill(process.pid, 'SIGUSR2');
  });

  // Handle kill command
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM signal received');
    await gracefulShutdown(server);
  });

  // Uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    gracefulShutdown(server).then(() => {
      process.exit(1);
    });
  });

  // Unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process here, just log the error
  });
}

async function gracefulShutdown(server: Server): Promise<void> {
  try {
    logger.info('Initiating graceful shutdown...');
    await server.shutdown();
    logger.info('Graceful shutdown complete');
  } catch (error) {
    logger.error('Error during shutdown:', error);
  }
  
  // If still running after 5 seconds, force exit
  setTimeout(() => {
    logger.warn('Forcing exit after timeout');
    process.exit(1);
  }, 5000).unref();
}

async function startServer() {
  logger.info(`Starting Magic Server in ${config.server.env} mode...`);
  
  try {
    // Set up observability (OpenTelemetry, logging, metrics)
    setupObservability();
    
    // Set up authentication middleware
    const authMiddleware = setupAuth();
    
    // Create appropriate transport based on configuration
    let transport;
    if (config.transport.default === 'websocket') {
      transport = new WebSocketTransport({ 
        port: config.transport.websocketPort as number 
      });
      logger.info(`Using WebSocket transport on port ${config.transport.websocketPort}`);
    } else {
      transport = new HttpTransport({ 
        port: config.transport.httpPort as number,
        corsOptions: {
          origin: config.cors.allowedOrigins,
          credentials: true
        }
      });
      logger.info(`Using HTTP transport on port ${config.transport.httpPort}`);
    }
    
    // Create server instance
    const server = new Server({
      transportAdapter: transport,
      middleware: [authMiddleware],
      developmentMode: config.server.env === 'development',
      gracefulShutdownTimeout: 5000
    });
    
    // Register handlers for inventory contract
    registerInventoryHandlers(server);
    
    // Set up process termination handlers
    setupProcessHandlers(server);
    
    // Initialize and start the server
    await server.initialize();
    logger.info('Magic Button Cloud server started successfully');
    
    // Log server status
    const status = server.getStatus();
    logger.info(`Server status: ${JSON.stringify(status)}`);
    
    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Export public API
export * from './contracts/inventory-contract';
export * from './handlers/inventory-handlers';
export * from './services/product-service';
export * from './services/order-service';
export * from './services/customer-service';
export { Server } from './server';
export { config } from './config';

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}