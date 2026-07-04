# Halolmia

Turborepo monorepo (npm workspaces).

## Structure

- `apps/*` — applications
- `packages/*` — shared packages

## Commands

```bash
npm install        # install all workspace deps
npm run dev        # run dev across workspaces
npm run build      # build all
npm run lint       # lint all
npm run test       # test all
```

Add a new app under `apps/` or a shared package under `packages/`, each with its
own `package.json`. Turbo picks them up automatically.
