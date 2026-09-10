FROM node:20-alpine
WORKDIR /app
COPY package.json index.mjs ./
EXPOSE 8787
CMD ["node", "index.mjs"]
