FROM node:22-alpine AS base
WORKDIR /home/node/app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

FROM base AS dev
ENV NODE_ENV=development
ARG DEV_TOOLS="mc vim nano git"
RUN apk add --no-cache $DEV_TOOLS
COPY webpack.config.js jest.config.ts ./
COPY .eslintrc .prettierrc tsconfig.json ./
COPY src/ ./src/
COPY test/ ./test/
CMD ["pnpm", "start:dev"]

FROM base AS staging
ENV NODE_ENV=staging
ENV DEBUG=true
COPY tsconfig.json ./
COPY src/ ./src/
RUN pnpm build
CMD ["pnpm", "start"]

FROM node:22-alpine AS prod
ENV NODE_ENV=production
WORKDIR /home/node/app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --production --frozen-lockfile && pnpm cache clean
COPY --from=staging /home/node/app/dist ./dist
USER node
HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget -qO- http://localhost:${PORT:-3000}/health | grep -q '"status":"ok"' || exit 1
EXPOSE ${PORT:-3000}
CMD ["node", "dist/main"]
