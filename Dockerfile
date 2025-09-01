FROM node:18-buster

RUN apt-get update && apt-get install -y \
    apt-transport-https \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

RUN wget --quiet --output-document=- https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /etc/apt/trusted.gpg.d/google-archive.gpg && \
    sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
    apt-get update && \
    apt-get install google-chrome-stable -y --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /home/node/app

COPY . .

RUN yarn install \
    && yarn cache clean \
    && yarn app:build

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:3000/healthcheck || exit 1

EXPOSE 3000

CMD ["node", "./dist/src/index.js"]
