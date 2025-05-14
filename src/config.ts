import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Define the configuration schema using Zod
const ConfigSchema = z.object({
  server: z.object({
    port: z.coerce.number().int().positive(),
    host: z.string().default('localhost'),
    env: z.enum(['development', 'test', 'production']).default('development'),
  }),
  auth: z.object({
    jwtSecret: z.string().min(1),
    tokenExpiresIn: z.string().default('24h'),
  }),
  db: z.object({
    url: z.string().url(),
  }),
  observability: z.object({
    otlpEndpoint: z.string().url(),
    serviceName: z.string().default('magic-server'),
    logLevel: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  }),
  cors: z.object({
    allowedOrigins: z.array(z.string().url()).default(['http://localhost:3000']),
  }),
  transport: z.object({
    default: z.enum(['websocket', 'http']).default('websocket'),
    websocketPort: z.coerce.number().int().positive(),
    httpPort: z.coerce.number().int().positive(),
  }),
});

// Process environment variables into the configuration
function loadConfig() {
  try {
    const config = {
      server: {
        port: process.env.PORT || 3000,
        host: process.env.HOST || 'localhost',
        env: process.env.NODE_ENV || 'development',
      },
      auth: {
        jwtSecret: process.env.JWT_SECRET || 'default-jwt-secret-dont-use-in-production',
        tokenExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
      },
      db: {
        url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/magic_server_db?schema=public',
      },
      observability: {
        otlpEndpoint: process.env.OTLP_ENDPOINT || 'http://localhost:4317',
        serviceName: process.env.SERVICE_NAME || 'magic-server',
        logLevel: process.env.LOG_LEVEL || 'info',
      },
      cors: {
        allowedOrigins: process.env.CORS_ALLOWED_ORIGINS 
          ? process.env.CORS_ALLOWED_ORIGINS.split(',')
          : ['http://localhost:3000'],
      },
      transport: {
        default: process.env.DEFAULT_TRANSPORT || 'websocket',
        websocketPort: process.env.WEBSOCKET_PORT || 8080,
        httpPort: process.env.HTTP_PORT || 8081,
      },
    };

    // Validate the configuration against the schema
    return ConfigSchema.parse(config);
  } catch (error) {
    console.error('Configuration error:', error);
    process.exit(1);
  }
}

// Export the configuration
export const config = loadConfig();

// Export the configuration type for type inference
export type Config = z.infer<typeof ConfigSchema>;