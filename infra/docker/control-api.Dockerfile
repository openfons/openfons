FROM node:22-bookworm-slim
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json vitest.config.ts .npmrc ./
COPY packages ./packages
COPY services/control-api ./services/control-api

RUN pnpm install --frozen-lockfile --filter @openfons/control-api...
RUN pnpm -r --filter @openfons/control-api... build

EXPOSE 3001
CMD ["pnpm", "--filter", "@openfons/control-api", "start"]
