---
name: video-js JSX angle-bracket trap
description: esbuild rejects literal > / < in JSX text; surfaces only when a scene module is requested, not at dev-server start
---

# Literal `>` / `<` in video scene JSX breaks the build

The video-js (Vite + esbuild) setup rejects bare `>` and `<` characters inside
JSX **text** with `The character ">" is not valid inside a JSX element`. Escape
them as `&gt;` / `&lt;` (or wrap as `{'>'}`).

**Why this keeps biting:** The DESIGN subagent likes terminal-style copy
(`SYS> ...`, `EVT> ...`) and comparison stats (`< 6h`, `> 99%`) in scene text.
Those literal brackets are easy to miss because:
- `validate-recording.sh` passes anyway.
- The dev workflow logs show Vite "ready" with no error — Vite transforms scene
  modules **on demand**, so the 500 only appears when the browser requests the
  broken scene (e.g. a later scene that hasn't rendered yet). Clean startup logs
  do NOT mean the scenes compile.

**How to apply:** After a video first build, before considering it done, either
load the preview and let it cycle through *every* scene, or curl each scene
module through Vite
(`curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT$BASE/src/components/video/video_scenes/SceneN.tsx`)
— a 500 means an esbuild transform error. Then grep scene files for stray
`>`/`<` in text and escape them.
