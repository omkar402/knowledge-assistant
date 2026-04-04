FROM node:20-alpine

WORKDIR /app

# Install build tools needed for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p uploads logs data/chroma

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "src/index.js"]
