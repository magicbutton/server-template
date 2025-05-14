import winston from 'winston';
import { config } from '../config';

// Define custom log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define custom colors for each log level
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(logColors);

// Define format for development environment
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define format for production environment
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Determine which format to use based on environment
const format = config.server.env === 'production' 
  ? productionFormat 
  : developmentFormat;

// Create the logger
const logger = winston.createLogger({
  level: config.observability.logLevel,
  levels: logLevels,
  format,
  transports: [
    // Console transport for all environments
    new winston.transports.Console(),
    
    // File transports for production environment
    ...(config.server.env === 'production' 
      ? [
          // Error log file
          new winston.transports.File({ 
            filename: 'logs/error.log', 
            level: 'error' 
          }),
          // Combined log file
          new winston.transports.File({ 
            filename: 'logs/combined.log' 
          }),
        ] 
      : []),
  ],
});

// Export the logger
export default logger;