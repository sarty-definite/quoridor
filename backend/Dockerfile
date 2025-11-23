## Two-stage Dockerfile for quoridor backend
# Build stage compiles TypeScript (requires devDependencies) and prunes dev deps
# Runtime stage contains only built JS and production node_modules

FROM node:20-alpine AS builder
WORKDIR /app

# Copy the whole repository into the build context so local packages (../core) are available
COPY . .

WORKDIR /app/backend

# Install everything (including devDependencies) so we can run tsc
RUN npm ci --omit=none

# Build TypeScript output into backend/dist
RUN npm run build

# Remove devDependencies to shrink node_modules
RUN npm prune --production


FROM node:20-alpine AS runner
WORKDIR /app/backend

# Copy built artifacts and production node_modules from the builder stage
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./package.json

ENV NODE_ENV=production
EXPOSE 3000

# Process.env.PORT is read by the server; default to 3000 inside the container
ENV PORT=3000

CMD ["node", "dist/index.js"]
