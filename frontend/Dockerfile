FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY config.template.js /usr/share/nginx/html/config.template.js
COPY 40-generate-config.sh /docker-entrypoint.d/40-generate-config.sh
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN sed -i 's/\r//' /docker-entrypoint.d/40-generate-config.sh && \
    chmod +x /docker-entrypoint.d/40-generate-config.sh
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
