# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY --from=builder /app/dist ./dist
# Re-create folders for uploads if needed
RUN mkdir -p uploads
EXPOSE 5000
ENV NODE_ENV=production
CMD ["node", "dist/server.js"]
