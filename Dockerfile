# Multi-stage Dockerfile
# Stage 1: build - install dev deps and compile TypeScript
FROM node:18-alpine AS build

WORKDIR /usr/src/app

# Ensure bash and build tools are available for npm scripts
RUN apk add --no-cache python3 make g++

# Copy package manifests and install all deps (including dev)
COPY package*.json ./
RUN npm ci

# Copy the rest of the sources and build
COPY . .
RUN npm run build && node ./scripts/copyDist.js

# Stage 2: runtime - production image with only runtime deps
FROM node:18-alpine AS runtime

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy package manifests and install only production deps (skip lifecycle scripts)
# We must skip npm lifecycle scripts here because postinstall runs the TypeScript build
# which requires source files and dev deps; those are present only in the build stage.
COPY package*.json ./
# --ignore-scripts prevents postinstall from running in the runtime image
RUN npm ci --omit=dev --ignore-scripts

# Copy built artifacts from the build stage
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/public ./public
COPY --from=build /usr/src/app/package.json ./package.json

# Expose port (Render sets PORT env var; app should read process.env.PORT)
EXPOSE 3000

# Start command - run the compiled server
CMD ["node", "dist/server.js"]
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install build deps
COPY package*.json ./
RUN npm ci --only=production || npm ci

# Copy source and build
COPY . .
RUN npm run build

# Expose port
ENV PORT=60613
EXPOSE ${PORT}

# Run the built server
CMD ["node", "dist/server.js"]
