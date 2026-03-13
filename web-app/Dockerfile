# Stage 1: Build Next.js
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:18-alpine
WORKDIR /app
RUN npm install -g pm2

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --production

# Copy the build output and backend files
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/ecosystem.config.js ./ecosystem.config.js

# Note: You will need to mount or copy secrets folder for AWS IoT certs
# For production, it's better to use AWS Secrets Manager or environment variables
# But for a simple deployment, we'll assume they are in ./secrets/
COPY --from=builder /app/secrets ./secrets

EXPOSE 3000
EXPOSE 4000

# Run both frontend and backend using PM2
CMD ["pm2-runtime", "ecosystem.config.js"]
