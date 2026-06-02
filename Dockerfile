# Use standard lightweight Alpine node image
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package configurations
COPY package*.json ./

# Install all dependencies (including devDependencies required for the build)
RUN npm ci

# Copy the rest of the workspace
COPY . .

# Build Vite frontend and bundle backend server using ESBuild
RUN npm run build

# --- Production runner image ---
FROM node:20-alpine AS runner

WORKDIR /app

# Set node environment and default port
ENV NODE_ENV=production
ENV PORT=3000

# Copy package manifests for production installation
COPY package*.json ./

# Install ONLY production dependencies to optimize image size
RUN npm ci --only=production

# Copy built frontend distributions and backend bundle from builder
COPY --from=builder /app/dist ./dist

# Initialize/seed empty databases if they don't exist yet
# (server.ts has fallbacks, but copying is helpful)
COPY --from=builder /app/package.json ./

# Expose port
EXPOSE 3000

# Command to boot compiled server.cjs CJS bundle
CMD ["npm", "run", "start"]
