# Series 2 — shelved content

8 moment cards + 4 rivalry cards, pulled from Series 1 rotation during the
identity restructure (2026-08-03) and parked here for a future drop.

Everything needed to re-launch them still ships in the codebase:

- Types: `moment` / `rivalry` in `lib/types.ts` (metrics, `momentDate`, `sides`)
- Frames: the cinematic moment frame in `components/TradingCard.tsx` and the
  split-face `components/RivalryArt.tsx`
- Rating configs: `RATING_CONFIG.moment` / `.rivalry` in `lib/rating.ts`

To drop Series 2: bump each card's `series` to 2, append this file's cards to
`data/cards.json`, re-add the Moments/Rivalries filters in
`components/CardGrid.tsx`, and consider fresh serials + pack-odds handling
(a separate Series 2 pack keeps Series 1 pulls clean).
