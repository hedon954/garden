# 独立后台容器：公开博客仍由 GitHub Pages 托管，不使用此镜像。
FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["sh", "-c", "npm run start -- --host 0.0.0.0 --port ${PORT:-3000}"]
