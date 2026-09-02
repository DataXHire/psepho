# Standing Constraints

- **Do not commit.** Leave all work in the working tree. The human reviews the diff, then commits.
- **Never read or write .env or .env.local.** You may create and edit `.env.example` only.
- **Stay in scope.** If you find yourself wanting a new dependency, a new service, or a new architectural layer that this document doesn't name, stop and put it in `docs/deferred.md` with your reasoning. Don't build it.
- **No placeholder data in shipped code paths.** If a screen needs content, use real content from the spec.
- **Flag your subjective calls.** Distinguish exact requirements from first-pass implementations.

## Design & Copy Invariants
- The question is the largest thing on the page.
- The interface never claims more certainty than the system has. Integrity labels are literal ("One vote per browser" for device level; never "per person", "one person", or "unique voter").
- Boldness is spent in exactly one place — the moment a vote is cast. Everything else is quiet.
- No rounded cards containing every piece of content, no soft grey drop shadows, no all-caps tracked-out eyebrow labels, no gradient washes as decoration, no meta strings joined with middle dots, no arrows appended to button labels, no monospace faces for small data labels.
- The tally is drawn as pebbles: small irregular filled shapes, three seeded outline variants, inline SVG. Hard rendering rule: never render more than 120 pebble nodes.
