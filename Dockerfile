FROM node:20.12.0-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends dumb-init

ENV NODE_ENV=production

WORKDIR /usr/src/app

COPY --chown=node:node . /usr/src/app

RUN npm ci --only=production

USER node

CMD ["dumb-init", "npm", "start"]
