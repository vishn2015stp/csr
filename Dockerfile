FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
# Install serve to run the application
RUN npm install -g serve
# Copy the build output from the builder stage
COPY --from=builder /app/dist ./dist

# Expose port 3000
EXPOSE 3000

# Start the application as a single-page app (-s) on port 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
