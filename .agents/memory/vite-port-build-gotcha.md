---
name: vite PORT requirement blocks builds
description: react-vite scaffold's vite.config throws on missing PORT even for `vite build`; gate it on command
---

The react-vite artifact scaffold's `vite.config.ts` throws at config-eval time if
`process.env.PORT` is unset. That check runs for EVERY vite command, including
`vite build`, so a production build (or any ad-hoc CLI build) fails with
"PORT environment variable is required" in any context where PORT isn't exported.

**Rule:** Gate the PORT check on `command === "serve"` (use the function form
`defineConfig(async ({ command }) => {...})`). Only the dev/preview server binds a
port; `vite build` does not. Keep `BASE_PATH` required in all commands — it sets
`base` and is needed at build time too.

**Why:** Deployment / CI build steps don't necessarily export PORT; an
unconditional throw turns a buildable app into a deploy failure.

**How to apply:** When hardening a react-vite artifact for deploy, or when a build
fails on PORT, convert vite.config to the function form and move the PORT parse +
validation inside an `if (command === "serve")` block with a sane default
(e.g. 5173) for build.
