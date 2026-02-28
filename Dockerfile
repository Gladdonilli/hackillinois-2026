FROM node:22-alpine AS builder
WORKDIR /app
COPY LARYNX/frontend/package.json LARYNX/frontend/package-lock.json* ./
RUN npm install
COPY LARYNX/frontend/ ./
ENV VITE_API_URL=https://larynx-api.tianyi35.workers.dev
RUN npx vite build

FROM node:22-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
EXPOSE 8000
CMD ["serve", "dist", "-s", "-l", "8000"]
