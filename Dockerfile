FROM node:16-bullseye-slim

# Set default port (can be overridden at runtime)
ARG PORT=3000
ENV PORT=$PORT
# Expose the port
EXPOSE $PORT

# Fix the time validation issue by removing apt security checks and installing Chrome directly
RUN apt-get update -o Acquire::Check-Valid-Until=false -o Acquire::Check-Date=false && \
    apt-get install -y --no-install-recommends \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    libgbm-dev

# Install Chromium directly from Debian repos (more reliable than Google Chrome in this case)
RUN apt-get install -y --no-install-recommends chromium && \
    rm -rf /var/lib/apt/lists/*

# Set all environment variables for application
ENV NODE_ENV=production \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    CHROMIUM_PATH=/usr/bin/chromium \
    CRYPTO_ALGORITHM=aes-256-gcm \
    CRYPTO_IV_LENGTH=16 \
    CRYPTO_TAG_LENGTH=16 \
    CRYPTO_SALT_LENGTH=32

# Create and set working directory
WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build TypeScript code
RUN npm run build

# Command to run the application
CMD ["node", "dist/index.js"]

# Healthcheck to monitor the application
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD wget -q --spider http://localhost:$PORT/ || exit 1