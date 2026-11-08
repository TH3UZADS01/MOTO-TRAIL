FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server ./server
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8787 DATA_DIR=/data
EXPOSE 8787
CMD ["node", "server/index.mjs"]
