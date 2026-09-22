FROM node:20-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN mkdir -p auth_info data logs

EXPOSE 3000
CMD ["npm", "start"]