FROM node:20-alpine

# Prisma's query/schema engine binaries need a real libssl present - Alpine's
# default image doesn't have one, which makes Prisma fail at runtime with a
# cryptic "Could not parse schema engine response" error.
RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

RUN mkdir -p /app/uploads

EXPOSE 4000
CMD ["sh", "-c", "npx prisma db push --skip-generate && node src/index.js"]
