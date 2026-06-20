---
name: Audio generation unavailable
description: generateMusic / textToSpeech / generateSoundEffect fail with 401 invalid_api_key in this environment
---

# Audio generation is not available in this environment

The media-generation audio callbacks (`generateMusic`, and by extension
`textToSpeech` / `generateSoundEffect`, which share the same provider key)
return HTTP 401 `{"status":"invalid_api_key"}` in this project's environment.

**Why this matters:** The `video-js` first-build flow (step 4 of
`first_build.md`) tells you to generate one default background-music bed after
the DESIGN subagent finishes. That step is blocked here. Retrying does not help
— it is an auth/provisioning limitation, not a transient error (confirmed by two
consecutive identical 401s).

**How to apply:**
- Do not burn multiple attempts on `generateMusic` if you hit a 401 — one retry
  at most, then proceed without audio.
- When audio is blocked, ship the video silent: still add the scene-selector
  controls (`scene_selectors.md`), but skip the audio mute button and the
  `<audio>` wiring, since there is no track to mute and a missing
  `public/audio/bg_music.mp3` would 404.
- If audio generation becomes available later, a follow-up can add the music bed
  plus the `Volume2`/`VolumeX` control per `references/audio.md`.
