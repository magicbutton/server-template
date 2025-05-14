FROM mcr.microsoft.com/devcontainers/javascript-node:18

# Install additional development tools
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    curl \
    wget \
    git \
    gnupg \
    lsb-release \
    ca-certificates \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# Install global node packages
RUN npm install -g npm@latest typescript ts-node nodemon

# Set development environment
ENV NODE_ENV=development

# Create workspace folder
WORKDIR /workspace

# Welcome message
RUN echo 'echo "\e[1;32m>>> Magic Server Development Container <<<\e[0m"' >> ~/.bashrc
RUN echo 'echo "- Start the server: npm run dev"' >> ~/.bashrc
RUN echo 'echo "- Start observability tools: docker-compose up -d"' >> ~/.bashrc
RUN echo 'echo "- Database access: npm run prisma:studio"' >> ~/.bashrc

# Default command for this container
CMD [ "sleep", "infinity" ]