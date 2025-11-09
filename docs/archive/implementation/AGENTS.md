# Repository Guidelines

## Project Structure & Module Organization

Routes live in `pages/`, while reusable views sit in `components/`. Shared hooks (`hooks/`), state stores (`stores/`), domain services (`services/`), and helpers (`utils/`) divide responsibilities cleanly. Validation schemas in `schemas/` and TypeScript contracts in `types/` keep Firebase data shapes consistent. Tests are grouped under `__tests__/`, project notes under `docs/`, static assets in `public/`, and styling via `styles/` plus `tailwind.config.js`. Firebase integration is isolated to `firebase.ts` with access rules in `firestore.rules`.

## Build, Test, and Development Commands

Use `npm run dev` for the default Next.js server; switch to `npm run dev:turbo` if hot reloads lag. Produce optimized bundles with `npm run build` and serve them with `npm run start`. Before review, run `npm run lint`, optionally `npm run lint:fix`, and `npm run type-check`. Jest workflows rely on `npm test`, `npm run test:watch`, and `npm run test:coverage`. Firestore scenario scripts (`npm run test:persistence`, `npm run test:user-watchlist`) guard data flows without touching production.

## Coding Style & Naming Conventions

Write TypeScript React function components with explicit prop types and avoid implicit `any`. Components use PascalCase filenames, helpers stay camelCase, and route files follow kebab-case to match URLs. Prettier (triggered by lint-staged) enforces two-space indentation and single quotes; never auto-format with other tools. ESLint rules from `eslint.config.mjs` require exhaustive hook dependencies and Next.js safe patterns.

## Testing Guidelines

Place Jest specs in `__tests__/` using `featureName.test.tsx` so they mirror the runtime file. Prefer React Testing Library’s `screen` queries and await Firebase-driven updates with `findBy*`. Run `npm run test:coverage` before pushing and document any snapshot churn in the PR. Use the TSX helpers in `scripts/` when you need seeded accounts or persistence fixtures.

## Commit & Pull Request Guidelines

Commits follow the history’s conventional form, e.g., `fix: avatar button not clickable`. Keep messages imperative, under 72 characters, and group related changes per commit. Pull requests should outline motivation, key changes, and a short test plan referencing the commands above. Link issues when available and add screenshots or clips for user-visible updates.

## Security & Configuration Tips

Keep credentials in local `.env*` files only; never commit Firebase or Sentry secrets. Any rule updates in `firestore.rules` should note rollout steps inside the PR. Rely on the documented sandbox accounts in `TEST_CREDENTIALS.md` to avoid collisions with live data.
