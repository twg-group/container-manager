FROM node:22-alpine AS base
WORKDIR /home/node/app
COPY *.json ./
COPY .yarnrc ./
COPY yarn.lock ./
RUN yarn install
CMD ["sh"]

FROM base AS build
WORKDIR /home/node/app
RUN apk add mc
RUN apk add vim
RUN apk add nano
COPY src/ ./src/
COPY test/ ./test/
COPY .prettierrc ./
COPY eslint.config.mjs ./
RUN yarn build
CMD ["sh"]

FROM build AS dev
ENV NODE_ENV=development
ENV MODE=APP
WORKDIR /home/node/app
CMD ["yarn", "start:dev"]

FROM build AS cron-dev
ENV NODE_ENV=development
ENV MODE=CRON
WORKDIR /home/node/app
CMD ["yarn", "start:dev"]

FROM base as migrations
ENV NODE_ENV=production
WORKDIR /home/node/app
COPY db/ ./db/
COPY .sequelizerc ./
CMD ["sh"]

FROM node:22-alpine AS pre-prod
ENV NODE_ENV=production
WORKDIR /home/node/app
COPY *.json ./
COPY .yarnrc ./
COPY yarn.lock ./
RUN yarn install --production

FROM pre-prod AS cron-prod
ENV NODE_ENV=production
ENV MODE=CRON
WORKDIR /home/node/app
COPY --from=pre-prod /home/node/app/node_modules/ ./node_modules/
COPY --from=build /home/node/app/dist/ ./dist/
CMD ["node", "dist/main"]

FROM pre-prod AS prod
ENV NODE_ENV=production
ENV MODE=APP
WORKDIR /home/node/app
COPY --from=pre-prod /home/node/app/node_modules/ ./node_modules/
COPY --from=build /home/node/app/dist/ ./dist/
CMD ["node", "dist/main"]
