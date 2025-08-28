FROM ghcr.io/puppeteer/puppeteer:24.17.1

# Configuração do ambiente
ENV NODE_ENV=production \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /usr/src/app

# Copiar arquivos de dependências primeiro (para melhor cache)
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependências
RUN npm ci

# Copiar todo o código
COPY . .

# Compilar o TypeScript para JavaScript
RUN npm run build

# Comando para iniciar a aplicação
CMD ["node", "dist/index.js"]