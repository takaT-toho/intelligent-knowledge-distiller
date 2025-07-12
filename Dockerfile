# Stage 1: Build the application using a "builder" stage
FROM node:18-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Securely mount the secret file and use it during the build.
RUN --mount=type=secret,id=env_file,dst=.env \
    echo "Using .env from secret"

# Build the application
RUN npm run build

# Stage 2: Create the final, lean production image
FROM node:18-alpine
WORKDIR /app

# Set the environment to production
# This ensures that server.js runs in production mode
ENV NODE_ENV=production

# Copy production dependencies and package.json
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules

# Copy the enhanced server and the built application
COPY --from=build /app/server.js .
COPY --from=build /app/dist ./dist

# Expose the port the app runs on.
# Cloud Run will automatically use this port if PORT env var is not set,
# but it's good practice to declare it.
EXPOSE 8080

# The command to start the server
CMD ["node", "server.js"]
