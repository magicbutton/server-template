# Magic Server

A modern, production-ready Node.js server template for building scalable microservices with the Magic Button Cloud messaging framework.

## Features

- ✨ **Type-Safe Contract-First Design**: Define your API contracts with Zod schemas for complete type safety
- 🔄 **Hot Module Replacement**: Fast development with automatic reloading when files change
- 🔌 **Multiple Transport Layers**: Support for both WebSocket and HTTP communication
- 🔒 **Authentication & Authorization**: Built-in JWT authentication and role-based access control
- 📊 **Observability**: Integrated OpenTelemetry for distributed tracing, metrics, and logging
- 📝 **Structured Logging**: Winston-based logging with different formats for development and production
- 🛑 **Graceful Shutdown**: Proper handling of process signals and clean server shutdown
- 🔍 **Error Handling**: Comprehensive error handling with proper client responses
- 🔄 **Environment Configuration**: Type-safe configuration management using Zod validation

## Quick Start

```bash
# Clone the repository (or use as a template)
git clone https://github.com/yourusername/magic-server.git
cd magic-server

# Install dependencies
npm install

# Setup environment and database
npm run setup

# Start the development server with hot reloading
npm run dev
```

The server will be available at:
- WebSocket: ws://localhost:8080
- HTTP: http://localhost:8081

## Development Tools

This template includes a complete development environment with:

- **TypeScript**: Strong typing for better code quality
- **ESLint**: Code linting and style enforcement
- **Jest**: Test framework for unit and integration tests
- **ts-node-dev**: Fast TypeScript execution with hot reloading
- **Prisma**: Type-safe database access and migrations
- **Docker Compose**: Containers for observability tools and database

## Directory Structure

```
magic-server/
├── config/               # Configuration for observability tools
├── prisma/               # Database schema and migrations
├── src/
│   ├── contracts/        # API contracts defined with Zod
│   ├── handlers/         # Request and event handlers
│   ├── lib/              # Shared utilities
│   ├── services/         # Business logic
│   ├── transport/        # Communication layer implementations
│   ├── config.ts         # Application configuration
│   ├── index.ts          # Application entry point
│   ├── server.ts         # Server implementation
│   └── types.ts          # Type definitions
├── tests/                # Test files
├── .env.example          # Example environment variables
├── docker-compose.yaml   # Docker services configuration
├── package.json          # Dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

## Configuration

The template uses a centralized configuration system with environment variables:

1. Copy the example environment file: `cp .env.example .env`
2. Modify the values in `.env` to match your environment
3. The `config.ts` file loads and validates all settings

Important environment variables:

```
# Server settings
PORT=3000
NODE_ENV=development

# Database connection
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/magic_server_db

# Authentication
JWT_SECRET=your-jwt-secret-key-here

# Transport Layer
DEFAULT_TRANSPORT=websocket
WEBSOCKET_PORT=8080
HTTP_PORT=8081
```

## Available Scripts

- `npm run dev`: Start development server with hot reloading
- `npm run build`: Build for production
- `npm run start`: Run the built application
- `npm run start:prod`: Run in production mode
- `npm run lint`: Check code style
- `npm run lint:fix`: Fix code style issues
- `npm run test`: Run tests
- `npm run test:watch`: Run tests in watch mode
- `npm run prisma:generate`: Generate Prisma client
- `npm run prisma:migrate`: Run database migrations
- `npm run prisma:studio`: Launch Prisma visual database editor

## Database and Observability

The template includes a complete development stack with database and observability tools:

1. **PostgreSQL**: Relational database for data storage
2. **pgAdmin**: PostgreSQL administration interface
3. **Jaeger**: Distributed tracing system
4. **OpenTelemetry Collector**: Collects and processes telemetry data
5. **Prometheus**: Metrics collection and storage
6. **Grafana**: Visualization and dashboards

Start the services:

```bash
docker-compose up -d
```

Access the tools:
- PostgreSQL: localhost:5432 (User: postgres, Password: postgres, Database: magic_server_db)
- pgAdmin: http://localhost:5050 (Email: admin@example.com, Password: admin)
- Jaeger UI: http://localhost:16686
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3210 (User: admin, Password: admin)

## Extending the Template

### Adding a New API Endpoint

1. Define the contract in `src/contracts/your-contract.ts`
2. Create handler in `src/handlers/your-handlers.ts`
3. Register the handlers in `src/index.ts`

### Adding a New Transport Layer

1. Create a new transport implementation in `src/transport/`
2. Implement the `TransportAdapter` interface
3. Update the configuration to use your new transport

## Debugging

The template includes VS Code debugging configurations in `.vscode/launch.json`:

1. **Debug Server**: Launch and debug the server with source maps
2. **Attach to Process**: Attach to a running Node.js process
3. **Debug Tests**: Run and debug Jest tests

To debug the server:

1. Start the server in debug mode: `npm run dev:debug`
2. Use the "Attach to Process" debug configuration in VS Code

VS Code Tasks are also available (Ctrl+Shift+P → "Tasks: Run Task"):

- Start Development Server
- Build Production
- Run Tests
- Start Docker Services
- Stop Docker Services
- Open Prisma Studio
- Full Project Setup

## GitHub Codespaces

This template is fully configured for GitHub Codespaces with:

1. Devcontainer configuration in `.devcontainer/`
2. Pre-configured extensions and settings
3. Docker Compose setup with all required services
4. Automated setup script that runs on container creation

To use with Codespaces:

1. Create a repository from this template
2. Click the "Code" button on GitHub and select "Create codespace on main"
3. Wait for the environment to set up
4. Start the server with `npm run dev`

## Production Deployment

For production deployment:

1. Build the application: `npm run build`
2. Set environment variables for production
3. Start the server: `npm run start:prod`

The template includes a GitHub Actions workflow for CI/CD in `.github/workflows/main.yml` that:

1. Runs tests on each push and pull request
2. Builds the application when merged to main
3. Uploads build artifacts

For containerized deployment:

```bash
docker build -t magic-server .
docker run -p 8080:8080 -p 8081:8081 --env-file .env.production magic-server
```

## License

MIT

---

Made with ❤️ using [Magic Button Cloud](https://magicbutton.cloud)