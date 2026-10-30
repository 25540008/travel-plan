FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
# postinstall chạy prisma generate
RUN npm ci --omit=dev
COPY src ./src
COPY docker-entrypoint.sh ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "docker-entrypoint.sh"]
