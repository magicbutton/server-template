#!/bin/bash
set -e

# Print message about current directory
echo "Current directory: $(pwd)"
echo "Listing directory content:"
ls -la

# Determine the repository directory in the codespace
REPO_DIR="/workspaces"

# Find the actual repository directory
if [ -d "$REPO_DIR/magic-server" ]; then
    WORKING_DIR="$REPO_DIR/magic-server"
elif [ -d "$REPO_DIR/$(basename "$(pwd)")" ]; then
    WORKING_DIR="$REPO_DIR/$(basename "$(pwd)")"
else
    # List contents of /workspaces to help debug
    echo "Contents of $REPO_DIR:"
    ls -la "$REPO_DIR"
    # Use the first directory in /workspaces as fallback
    WORKING_DIR=$(find "$REPO_DIR" -maxdepth 1 -type d | grep -v "^$REPO_DIR$" | head -1)
fi

echo "Using working directory: $WORKING_DIR"

# Navigate to the project directory
cd "$WORKING_DIR"

# Check for package.json
if [ ! -f "package.json" ]; then
    echo "No package.json found in $WORKING_DIR"
    echo "Contents of $WORKING_DIR:"
    ls -la
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
fi

# Generate Prisma client
if [ -d "prisma" ]; then
    echo "Generating Prisma client..."
    npx prisma generate
fi

echo "Setup completed successfully!"