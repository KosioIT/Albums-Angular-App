# The API (Express). Secrets are not part of the image: backend/.env and the Firebase key are
# given to the container when it starts (see docker-compose.yml).
FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production

# Dependencies first, so they are cached while only the code changes
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "server.js"]
