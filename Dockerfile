# ---------------------
# Base image
# ---------------------
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose NestJS port
EXPOSE 3000

# ---------------------
# Development stage
# ---------------------
FROM base AS dev

# Run NestJS in watch mode
CMD ["npm", "run", "start:dev"]

# ---------------------
# Production stage
# ---------------------
FROM base AS prod

# Build app
RUN npm run build

WORKDIR /app
COPY package*.json ./
COPY --from=base /app/dist ./dist
RUN npm install --only=production

# Start compiled app
CMD ["node", "dist/main.js"]
