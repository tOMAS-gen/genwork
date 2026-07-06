FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
# CLI de prisma completo para `migrate deploy` en el arranque (el standalone
# de Next solo trae el cliente, no el CLI ni sus dependencias)
RUN npm install -g prisma@6.8.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY deploy/entrypoint.sh ./entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["sh", "./entrypoint.sh"]
