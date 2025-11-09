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
