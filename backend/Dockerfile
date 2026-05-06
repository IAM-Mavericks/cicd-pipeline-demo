FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY node_modules ./node_modules
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
