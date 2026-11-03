FROM node:24-alpine

# Actualitza els paquets del sistema (OpenSSL, libc, etc.) dins la imatge final
RUN apk upgrade --no-cache \
 && apk add --no-cache tini

ENV NODE_ENV=production \
    PORT=3000 \
    SERVE_FRONTEND=true \
    ALLOW_GITHUB_PAGES=true

WORKDIR /app

# Dependències primer (millor cache de capes)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
 && npm cache clean --force

# Codi de l'aplicació (frontend estàtic + backend FocusIA + models GLB)
COPY . .

# Executa sense privilegis
USER node

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.mjs"]
