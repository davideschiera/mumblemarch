# X-key anomaly (EV3 open item) — root cause: stale persisted bindings on origin localhost:5196

Investigated by ui-lead-2, 2026-09-26, single own page on snapshot port 5196.

## Repro in the shared 5196 origin (default browser context)
`__game.loadLevel('spade-expectations'); __game.step(80)`; canvas focused; press_key `x`:
- keydown log: `["down","x","KeyX",false,…,80]`, one keyup, no click events.
- after: `paused:false`, tick 80 → 133 (real time running), `selectedLemmingId:null`, announcer: "Resumed".

`localStorage['mumblemarch.save'].settings.bindings` on that origin:
`{"lemming-next":["KeyK"],"pause":["KeyX"],"fast-forward":["NumpadDivide"]}`
— left behind by the E3b1 rebinding browser check (persist/reload + clash Swap) that ran on :5196.
So X was *bound to pause* and lemming-next no longer had X or ]. Z (lemming-prev) was untouched,
which is why Z "worked". EV3 ran on the same port/origin and inherited these settings.

## Clean isolated context (new_page isolatedContext "ui-lead-2-xkey", no saved bindings)
- tick 80, paused, 1 mumble out; press `x` → `paused:true`, tick 80, `selectedLemmingId:0`,
  announcer "Walker, facing right, 1 of 1".
- step(120) → tick 200, 6 out; press `]` → `paused:true`, tick 200, `selectedLemmingId:5`,
  announcer "Faller, facing right, 1 of 6".

## Verdict
Not a code defect: harness artifact (per-origin localStorage shared between validators on the same
port). No code change. Recommendation for later browser validators: open pages with
`isolatedContext` (or clear `mumblemarch.save`) before keyboard checks.
