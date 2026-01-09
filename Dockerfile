FROM node:24-alpine AS build
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@10.13.1 && pnpm install --frozen-lockfile

COPY . .
ARG VITE_API_URL
ARG VITE_METADATA_URL
ENV VITE_API_URL=$VITE_API_URL \
    VITE_METADATA_URL=$VITE_METADATA_URL
RUN pnpm run build



FROM nginx:1.29-alpine AS release
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
