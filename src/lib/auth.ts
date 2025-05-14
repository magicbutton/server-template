import jwt from 'jsonwebtoken';
import { Middleware, Message } from '../types';
import { config } from '../config';
import logger from './logger';
import { CustomerService } from '../services/customer-service';

// Define the shape of JWT payload
interface TokenPayload {
  id: string;
  email: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}

// Verify JWT token function
export const verifyToken = async (token: string): Promise<TokenPayload | null> => {
  try {
    // Remove "Bearer " prefix if present
    const tokenValue = token.startsWith('Bearer ') ? token.slice(7) : token;
    
    // Verify the token
    const decoded = jwt.verify(tokenValue, config.auth.jwtSecret) as TokenPayload;
    
    // Get customer from database to ensure they exist
    const customer = await CustomerService.getCustomer(decoded.id);
    if (!customer) {
      logger.warn(`Authentication failed: Customer with ID ${decoded.id} not found`);
      return null;
    }
    
    logger.debug(`Token verified for user ${decoded.id} (${decoded.email})`);
    return {
      id: decoded.id,
      email: decoded.email,
      isAdmin: decoded.isAdmin
    };
  } catch (error) {
    logger.error('Token verification failed:', error);
    return null;
  }
};

// Create a middleware to handle authentication
export const setupAuth = (): Middleware => {
  return async (message: Message, clientId: string, next: () => Promise<Message | void>) => {
    try {
      const token = message.context?.auth?.token;
      
      if (token) {
        const user = await verifyToken(token);
        
        if (user) {
          // Add authenticated user information to the message context
          if (!message.context) {
            message.context = {};
          }
          
          message.context.auth = {
            userId: user.id,
            roles: [user.isAdmin ? 'admin' : 'customer'],
            ...message.context.auth
          };
          
          logger.debug(`Request authenticated for user ${user.id} with roles: ${message.context.auth.roles}`);
        } else {
          logger.warn(`Invalid token in request from client ${clientId}`);
        }
      } else {
        logger.debug(`Unauthenticated request from client ${clientId}`);
      }
      
      // Always continue to next middleware or handler, even if auth fails
      // The permission checks will handle unauthorized requests
      return await next();
    } catch (error) {
      logger.error('Error in authentication middleware:', error);
      throw error;
    }
  };
};

// Create a token for a user (used in tests and auth endpoints)
export const generateToken = (payload: Omit<TokenPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, config.auth.jwtSecret, { 
    expiresIn: config.auth.tokenExpiresIn 
  });
};