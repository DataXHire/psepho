# Deferred Architecture and Features

This document tracks features, dependencies, or architectural layers considered but explicitly deferred to respect the strict v1 scope of `psepho`.

| Item | Reason Deferred | Target Milestone |
| :--- | :--- | :--- |
| **Algorithmic feed & public poll directory** | Explicitly out of scope for v1. Polls are direct link-shared civic instruments. | Post-v1 |
| **Social graph (comments, replies, reactions)** | Explicitly out of scope. Avoids noise, engagement-hacking, and distraction from civic tallying. | Never / Out of scope |
| **Identity-verified voting tier** | Scaffolded in schema (`integrity: 'verified'`), but UI must not offer until identity verification infrastructure is established. | v2 |
| **Paid third-party realtime (Pusher, Ably)** | Banned in favor of efficient HTTP polling with strong ETags and SSE for Room mode only. | Not needed |
| **Push notification provider** | Hooks kept clean, no external push provider wired in v1. | Mobile v2 |
| **Monospace numbers for UI** | Explicitly forbidden in design spec; replaced by `font-variant-numeric: tabular-nums` on variable Archivo. | Not needed |
