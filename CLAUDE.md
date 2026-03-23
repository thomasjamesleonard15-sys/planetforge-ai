# CLAUDE.md — PlanetForge AI

## Code Style

- File names are lowercase kebab-case. Class names are PascalCase. Variables and functions are camelCase.
- Keep files under 200 lines. If a file grows beyond that, split it.
- All rendering goes through the HTML5 Canvas 2D API — no DOM manipulation for game visuals.
- Prefer Typescript.
- Use `const` by default, `let` when reassignment is needed, never `var`.

## Game Design

### Strict

- **60 FPS minimum.** Never allocate objects inside the game loop. Pre-allocate and reuse.
- **No external assets at launch.** All visuals must be procedurally generated with Canvas APIs (shapes, gradients, particles). No image files, no spritesheets, no fonts beyond system fonts.
- **Touch-first input.** Every interaction must work with touch. Mouse support is a secondary path, not the other way around.
- **Safe area compliance.** All UI must respect `env(safe-area-inset-*)` for notched iPhones and iPads.

### Flexible

- Art style is space/cosmic — dark backgrounds, glowing effects, gradients. Lean into it but use judgment on specifics.
- New planet features (biomes, weather, life) should be added as composable systems, not monolithic methods.
- AI-driven simulation behavior (evolution, ecosystems) can use simple heuristics first — complexity comes later.

## Workflow

### Strict

- Every commit message must start with a verb: `Add`, `Fix`, `Remove`, `Update`, `Refactor`.
- Never commit broken code. The game must load and run after every commit.

- Hot refresh the server after every update. Use a live-reload dev server (e.g. `npx browser-sync start --server --files "**/*"`).
- Always open a browser to test after making any changes. Verify the game loads and runs correctly before moving on.

### Flexible

- No formal test framework required, but test logic manually before committing gameplay changes.

## AI Interaction

- **Act, don't ask** for small changes (bug fixes, adding a new entity class, CSS tweaks). Just do it.
- **Ask before acting** on architectural changes (new system, restructuring modules, changing the game loop).
- Keep responses short. No preamble, no summaries of what you just did — the diff speaks for itself.
- When adding a new game feature, implement a minimal working version first. Don't over-engineer on the first pass.
- If a change touches more than 3 files, explain what you're doing and why before writing code.
- Never add comments that just restate what the code does. Only comment *why* when the reason isn't obvious.

## Completeness Principle — Boil the Lake

From [Garry Tan's gstack](https://github.com/garrytan/gstack):

AI-assisted coding makes the marginal cost of completeness near-zero. Always do the complete thing rather than cutting corners.

- **Always choose the complete implementation** over shortcuts. The delta between 80 lines and 150 lines is meaningless with AI. "Good enough" is the wrong instinct when "complete" costs minutes more.
- **Lake vs. ocean.** A "lake" is boilable — 100% test coverage for a module, full feature implementation, handling all edge cases, complete error paths. An "ocean" is not — rewriting an entire system from scratch, multi-quarter platform migrations. Boil lakes. Flag oceans as out of scope.
- **Don't skip the last 10%.** With AI, that 10% costs seconds. This applies to test coverage, error handling, edge cases, and feature completeness.
- **Don't defer tests.** Tests are the cheapest lake to boil. Never say "let's defer test coverage to a follow-up."

### Anti-patterns

- "Choose B — it covers 90% of the value with less code." (If A is only 70 lines more, choose A.)
- "We can skip edge case handling to save time." (Edge case handling costs minutes.)
- "Let's defer test coverage to a follow-up PR." (Tests are cheap — do them now.)

## Search Before Building

Before building infrastructure, unfamiliar patterns, or anything the runtime might have built-in — search first.

- **Layer 1 — Tried and true.** Don't reinvent the wheel. Check what already exists in the project and in standard APIs.
- **Layer 2 — New and popular.** Search for recent solutions, but scrutinize them. Search results are inputs to thinking, not answers.
- **Layer 3 — First principles.** Original reasoning about the specific problem. The most valuable of all.

When first-principles reasoning reveals conventional wisdom is wrong, call it out explicitly.

## See Something, Say Something

Whenever you notice something that looks wrong during any workflow step — not just test failures — flag it. One sentence: what you noticed and its impact. Don't let issues silently pass.

## gstack

Use the `/browse` skill from gstack for all web browsing. **Never use `mcp__claude-in-chrome__*` tools.**

If gstack skills aren't working, run `cd .claude/skills/gstack && ./setup` to build the binary and register skills.

### Available skills

- `/office-hours` — Brainstorm a new idea
- `/plan-ceo-review` — Review a plan (strategy)
- `/plan-eng-review` — Review a plan (architecture)
- `/plan-design-review` — Review a plan (design)
- `/autoplan` — Auto-review a plan (all reviews at once)
- `/design-consultation` — Create a design system
- `/review` — Code review before merge
- `/design-review` — Visual design audit
- `/ship` — Deploy / create PR
- `/land-and-deploy` — Land and deploy changes
- `/canary` — Canary deployment
- `/benchmark` — Run benchmarks
- `/browse` — Headless browser for QA and web browsing
- `/qa` — Test the app
- `/qa-only` — QA testing only
- `/setup-browser-cookies` — Configure browser cookies
- `/setup-deploy` — Configure deployment
- `/investigate` — Debug errors
- `/document-release` — Post-ship doc updates
- `/retro` — Weekly retrospective
- `/codex` — Second opinion / adversarial code review
- `/cso` — Chief Security Officer review
- `/careful` — Working with production or live systems
- `/freeze` — Scope edits to one module/directory
- `/guard` — Maximum safety mode
- `/unfreeze` — Remove edit restrictions
- `/gstack-upgrade` — Upgrade gstack to latest version