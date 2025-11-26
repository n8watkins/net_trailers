# Repository Guidelines

## Project Structure & Module Organization
- Next.js app lives under `app/`, with feature-specific UI in `components/`, state stores in `stores/`, hooks in `hooks/`, and shared utilities in `utils/`.  
- Firebase configs, rules, and scripts reside in the repo root (`firebase.ts`, `storage.rules`, `scripts/`).  
- Tests sit in `__tests__/` alongside Jest config files (`jest.config.js`, `jest.setup.js`). Assets such as images and fonts are under `public/` and `styles/`, while large screenshots are kept outside the repo in `/home/natkins/win-res/screenshots` (reference this path when discussing screenshots; do not add them here).

## Build, Test, and Development Commands
- `npm run dev` – launches the dev server through `scripts/dev-safe.js`, which also handles cache cleanup.  
- `npm run dev:quiet` – same as dev, but suppresses verbose Next.js request logs.  
- `npm run build` / `npm start` – production build and serve.  
- `npm test`, `npm run test:watch`, `npm run test:coverage` – run Jest suites, watch mode, and coverage reporting.  
- `npm run lint`, `npm run lint:fix`, `npm run type-check` – ESLint (with autofix) and TypeScript validation.

## Coding Style & Naming Conventions
- TypeScript/React everywhere; prefer functional components and hooks.  
- Tailwind CSS powers styling, stored in class strings; avoid unseen dynamic class names.  
- Follow existing naming: camelCase for variables/functions, PascalCase for components, kebab-case for files/pages (`app/docs/debugger-console`).  
- Autoformat via Prettier and lint via ESLint before committing.

## Testing Guidelines
- Jest with `@testing-library/react` for UI and DOM assertions.  
- Co-locate specs in `__tests__/`, mirroring source structure (e.g., `__tests__/hooks/useSearch.test.ts`).  
- Ensure new features ship with targeted tests; run `npm run test:coverage` if changes affect critical flows.

## Commit & Pull Request Guidelines
- Commits typically use conventional prefixes (`feat:`, `fix:`, `chore:`) and concise descriptions (see git log).  
- Each PR should explain scope, testing performed, and any screenshots for UI changes. Link related issues or tracking docs when possible.

## Security & Configuration Tips
- Secrets are managed via environment variables; never hard-code Firebase or TMDB keys.  
- Debug-only tooling (e.g., `app/docs/**`, `components/debug/**`) must stay development-gated with `process.env.NODE_ENV !== 'development'` checks.
