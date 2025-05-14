import { OTLPTraceExporter, SimpleSpanProcessor } from '@opentelemetry/exporter-trace-otlp-proto';
import { Resource } from '@opentelemetry/resources';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { config } from '../config';
import logger from './logger';

// Initialize and configure OpenTelemetry
export function setupObservability() {
  try {
    logger.info('Setting up observability with OpenTelemetry');
    
    // Create a resource that identifies our service
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: config.observability.serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '0.0.0',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.server.env,
    });

    // Create a trace provider with the resource
    const provider = new NodeTracerProvider({ resource });
    
    // Configure the OTLP exporter
    const exporter = new OTLPTraceExporter({
      url: config.observability.otlpEndpoint + '/v1/traces',
    });

    // Register span processor
    provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
    
    // Register the provider
    provider.register();
    
    // Return the configured tracer
    const tracer = provider.getTracer(config.observability.serviceName);
    
    logger.info('Observability setup complete');
    return { tracer };
  } catch (error) {
    logger.error('Failed to initialize observability:', error);
    
    // Return a no-op implementation if setup fails
    // This allows the application to run even if observability fails
    return {
      tracer: {
        startSpan: () => ({
          end: () => {},
          setAttributes: () => {},
          recordException: () => {},
          updateName: () => {},
        }),
        startActiveSpan: (_name: string, options: any, fn: Function) => fn({
          end: () => {},
          setAttributes: () => {},
          recordException: () => {},
          updateName: () => {},
        }),
      },
    };
  }
}

// Create a function to record spans for message handling
export function createMessageSpan(tracer: any, message: any, operation: string) {
  const span = tracer.startSpan(`message.${operation}`, {
    attributes: {
      'message.id': message.id,
      'message.type': message.type,
    },
  });
  
  // Record message context if available
  if (message.context?.tracing) {
    span.setAttributes({
      'tracing.request_id': message.context.tracing.requestId,
      'tracing.parent_id': message.context.tracing.parentId,
    });
  }
  
  return span;
}