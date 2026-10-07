# syntax=docker/dockerfile:1

# ---- build: gera os arquivos estáticos ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# VITE_API_URL fica vazio de propósito: o navegador chama /api no mesmo endereço do site,
# e o nginx encaminha para o backend (sem CORS e sem URL fixa dentro do bundle).
RUN npm run build

# ---- runtime: nginx sem privilégios servindo o SPA ----
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
