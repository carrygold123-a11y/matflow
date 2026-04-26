FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY shared/types ./shared/types
COPY shared/utils ./shared/utils
COPY backend/database ./backend/database
COPY backend/modules ./backend/modules
COPY backend/api ./backend/api

RUN npm install
RUN npm run generate --workspace @matflow/database && npm run generate --workspace @matflow/backend-modules
RUN npm run build --workspace @matflow/shared-types && npm run build --workspace @matflow/shared-utils && npm run build --workspace @matflow/backend-modules && npm run build --workspace @matflow/api

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/api ./backend/api
COPY --from=builder /app/backend/modules ./backend/modules
COPY --from=builder /app/backend/database ./backend/database
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["npm", "run", "start", "--workspace", "@matflow/api"]
