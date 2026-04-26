FROM node:20-alpine AS builder
WORKDIR /app
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL

COPY package.json tsconfig.base.json ./
COPY shared/types ./shared/types
COPY shared/utils ./shared/utils
COPY apps/web ./apps/web

RUN npm install
RUN npm run build --workspace @matflow/shared-types && npm run build --workspace @matflow/shared-utils && npm run build --workspace @matflow/web

FROM nginx:1.27-alpine AS runtime
COPY infra/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
