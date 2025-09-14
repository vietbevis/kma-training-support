FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./

RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS production
WORKDIR /app

# Cài PostgreSQL client (có pg_dump, pg_restore, psql)
RUN apk add --no-cache postgresql-client

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.env ./

ENV NODE_ENV=production
RUN npm prune --production

EXPOSE 4000 4001

# Command to run the app
CMD ["node", "dist/main"]