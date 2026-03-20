FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src/ ./src/
COPY tsconfig.json ./
RUN npx tsc -p tsconfig.json
EXPOSE 8080
ENV NODE_ENV=production
CMD ["node", "dist/server.js"]
