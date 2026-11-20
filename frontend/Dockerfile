# 1. Build the Angular app. It talks to the API on the same address (/api, proxied by Nginx),
#    so the build needs no server address.
FROM node:22-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN mkdir -p src/environments \
 && printf "export const environment = {\n  production: true,\n  apiUrl: '/api',\n};\n" > src/environments/environment.ts \
 && npx ng build

# 2. Serve it with Nginx, which also forwards /api to the API container
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
EXPOSE 80
