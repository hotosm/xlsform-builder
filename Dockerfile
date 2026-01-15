FROM node:24-alpine AS build
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@10.13.1 && pnpm install --frozen-lockfile

COPY . .
# Note: VITE_API_URL and VITE_METADATA_URL are injected at runtime via
# docker-entrypoint.sh from container environment variables. Build-time
# values are not needed. For local npm dev, use .env file or process.env.
RUN pnpm run build



FROM nginx:1.29-alpine AS release
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
