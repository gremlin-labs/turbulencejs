# Turbulence repository rules

## Directory layout

- `src/` contains publishable library source. Platform-neutral behavior lives in `runtime/`; browser behavior in `core/`, `turbscript/`, recipes, surfaces, and interactions; process adapters in `dom/` and `main/`.
- `examples/` contains standalone examples. The Vite showcase remains a nested private package at `examples/showcase/`.
- `skills/` contains portable agent skills. Each published skill must carry every contract, reference, template, and script needed to work when copied independently.
- `dist/` contains generated package output and is never committed.
- `agent-work/` contains local audit, planning, and execution history and is never committed or published.
- Root files are limited to public project documentation, package/build configuration, and repository configuration.

## Naming

- JavaScript modules use the lowercase camel-case convention established by the repository.
- Public Markdown files use conventional uppercase names where applicable: `README.md`, `LICENSE`, `CHANGELOG.md`, `CONTRIBUTING.md`, and `RULES.md`.
- Example filenames use lowercase kebab-case.

## Colocation

- Example-specific source, assets, lockfiles, and configuration stay inside that example directory.
- Tests live under top-level `test/` and mirror `src/` when added.
- Generated bundles do not live beside source except in ignored build directories.

## Modules and documentation

- Reusable runtime behavior belongs in `src/`; showcase-only behavior stays in `examples/showcase/src/`.
- Preserve public exports unless a documented compatibility change is approved.
- Internal plans are not public behavior documentation. Durable behavior is rewritten into `README.md` or `docs/` after implementation verification.

## Public and private files

- Ignore `agent-work/`, dependencies, generated builds, coverage, local environment files, logs, packaged archives, OS/editor metadata, and temporary files.
- Keep root and example lockfiles committed for reproducible dependency graphs.
- Keep authored showcase source and assets committed; do not commit copied Turbulence bundles under `examples/showcase/public/`.
- Git ignore status does not restrict development access. Use explicit paths or `rg --no-ignore` when internal artifacts are needed.
