# Multi-stage build
# Stage 1: Build React Production Assets
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY . .
ENV NODE_ENV=production
RUN npm run build

# Stage 2: Nginx server siêu nhẹ để serve ứng dụng
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
