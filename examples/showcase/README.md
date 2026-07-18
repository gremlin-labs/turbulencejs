# Turbulence SaaS motion lab

This private Vite example is a static, framework-free SaaS dashboard mock for judging Turbulence in realistic interface context. The fictional “Turbshire Bathaway” conglomerate is a playful investing parody built to promote Turbulence while stress-testing it. It has no router, backend, authentication, persistence, analytics, brokerage services, or real customer data.

## Run it

From the repository root:

```bash
npm install
npm run build
npm --prefix examples/showcase install
npm --prefix examples/showcase run dev
```

Or verify the production build with:

```bash
npm run showcase:verify
```

The showcase consumes `turbulencejs` through the nested package's `file:../..` dependency. Build the root package first whenever its generated exports may be stale.

## Motion console

Open the console with `Cmd+K`, `Ctrl+K`, the top search control, or the Turbulence Lab control in the sidebar.

Available page profiles, all compiled through public TurbScript:

- Quiet — restrained product motion.
- Waterfall — a top-down cascade.
- Sproing — elastic overshoot and settle.
- Slam — asymmetric impact.
- Glitch — a brief signal break.
- Zero Gravity — drifting spatial motion.
- Bubble In — buoyant cartoon settle.
- Skedaddle — alternating runway entrances.
- 3D Card — seeded directional pitch and landing.
- Cinematic Slide — alternating anchored wipes.

Each profile supports Restrained, Expressive, and Wild intensity. The current choice is encoded in the URL:

```text
?motion=sproing&intensity=wild
```

Unknown query values safely fall back to Quiet and Expressive. Turbulence still honors the operating system's `prefers-reduced-motion` preference.

For a reproducible local accessibility check, append `&reduced=1`. This lab-only override uses instant final states and does not replace native operating-system detection.

## Interaction inventory

- Collapsible desktop sidebar and mobile navigation drawer.
- Account and analytics filter menus.
- KPI cards, SVG charts, activity feed, and searchable parody client table.
- Report modal with validation, loading, focus restoration, and success feedback.
- Success, warning, and error toasts with manual and automatic dismissal.
- Ready, loading, empty, and error/retry component states.
- Keyboard-contained command and report dialogs.
- A public-export-only Turbulence desk for Snaporate fidelity/seeds, Enhance success/retry, Sidebar Ready variants, and Tetris Load win workflows.
- Pointer and keyboard client-row reordering where Turbulence owns motion and the mock host owns the DOM commit.
- `surface-benchmark.html`, a repeatable Canvas2D size benchmark plus DOM/Canvas2D/WebGL2/worker/auto and image/DOM-source conformance matrix.

All names, organizations, holdings, and metrics are invented. No securities are offered; the only recommended investment is better interface momentum.

## Add an experiment

1. Add a TurbScript `program` to `src/motion-profiles.js` and its name to `profileNames`.
2. Add one matching command choice to `src/index.html`.
3. Target existing `[data-motion-item]` cohorts. Keep animation orchestration out of component markup.
4. Return one composed Turb. The runner owns it through one performance and restores its properties on replay.
5. Add query/ownership coverage under `test/showcase/` and run `npm run showcase:verify`.
6. Exercise the new profile with full and reduced motion at mobile and desktop widths.

Showcase behavior must use only public exports from `turbulencejs`. If an experiment reveals a library defect or missing primitive, document it separately instead of importing from `src/` or hiding a library change inside the example.

## Turbulence and interaction evidence

The Turbulence desk exposes fidelity, seed, sidebar-finish, and Tetris-win controls and prints the equivalent public recipe call. It intentionally includes an Enhance missing-preview path to prove retry/error recovery while semantic content remains usable. Every experiment writes local diagnostic status and must return generated overlays/canvases to zero.

Client table rows are keyboard draggable: focus a row, press Space or Enter to pick up, use arrow keys to move, press Space/Enter to drop, or Escape to cancel. Pointer drag uses the same validity and host commit callback. The hidden live region contains mock-app localized announcements; the library supplies message keys only.

Open `/surface-benchmark.html` on the dev or preview server to rerun the representative surface measurements. Browser engines or capabilities that are not present must be reported as unavailable; a fallback selection is not evidence that the requested accelerated renderer ran.
