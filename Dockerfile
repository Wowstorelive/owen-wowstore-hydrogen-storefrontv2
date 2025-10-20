FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build

ENV PORT 8080

EXPOSE 8080

CMD ["shopify", "hydrogen", "preview"]
