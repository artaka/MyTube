# Этап 1: Сборка статики
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Этап 2: Раздача через Nginx
FROM nginx:alpine
# Удаляем дефолтный конфиг Nginx
RUN rm /etc/nginx/conf.d/default.conf
# Копируем скомпилированную статику из папки dist (Vite)
COPY --from=builder /app/dist /usr/share/nginx/html
# Копируем ваш конфиг Nginx (предполагается, что он лежит в папке frontend/nginx.conf,
# либо прокиньте его через docker-compose как раньше)
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]