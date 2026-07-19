# Agent skill integration

TurbulenceJS ships a portable `turbulencejs-integration` agent skill. It helps an agent inspect a target project, present meaningful entrypoint/style/intensity choices, implement the approved motion system, verify accessibility and lifecycle behavior, and document the result.

## Install the skill

Install `turbulencejs` in the target project first, then copy the complete skill folder to the directory recognized by the agent host. Examples:

```bash
# Codex and compatible agents
mkdir -p .agents/skills
cp -R node_modules/turbulencejs/skills/turbulencejs-integration .agents/skills/

# Claude Code project skill
mkdir -p .claude/skills
cp -R node_modules/turbulencejs/skills/turbulencejs-integration .claude/skills/
```

The copied folder is the installation unit. Keep `SKILL.md`, `REFERENCE.md`, `WORK-ARTIFACTS.md`, `catalog.json`, `templates/`, and `scripts/` together. No files from gremlin-skills are required.

When developing from this repository, copy from `skills/turbulencejs-integration` instead of `node_modules`.

## Invoke it

Requests can be broad or precise:

- “Use TurbulenceJS to add restrained motion to this dashboard.”
- “Show me playful, cinematic, and extreme options before integrating animation.”
- “Integrate TurbulenceJS into this Electron app; renderer motion should be expressive but native window movement restrained.”
- “Replace the existing animation library with TurbulenceJS and verify reduced motion and teardown.”

If style or intensity is unresolved, the skill presents two or three combinations and lets the user choose. Levels 3–4 require explicit approval. A user may select different profiles by surface—for example, intensity 2 in an Electron renderer and intensity 1 for main-process window bounds.

## Selection model

The skill distinguishes four decisions:

1. **Surface:** browser, Electron renderer, Electron main, generic runtime, or worker.
2. **Entrypoints:** the smallest useful subset of root, `/runtime`, `/dom`, `/main`, recipes, interactions, surfaces, and effects.
3. **Style:** restrained, product, playful, cinematic, high-impact, theatrical, interactive, or host-defined.
4. **Intensity:** level 0 essential through level 4 theatrical.

These are not separate npm dependencies. `turbulencejs` is one package; subpath imports keep optional capabilities explicit and prevent accidental runtime/process mixing.

## Work artifacts

The skill carries a standalone version of the Gremlin work-artifact pattern:

```text
agent-work/{slug}/
  WORK.md
  turbulencejs-integration/
    DECISIONS.md
    INTEGRATION-PLAN.md
    IMPLEMENTATION-REPORT.md
    NOTES.md                    # optional
```

The target repository is the default owner. If a workspace manifest registers the target as a child, the skill uses the parent workspace's existing `agent-work/` root. This keeps internal execution history out of public children while still working in ordinary standalone repositories.

The skill does not call or require Planpro, Goalpro, Motionpro, or any other external skill. It contains its own inspect → choose → plan → implement → verify → document loop.

## Included implementation

| File | Role |
|---|---|
| `SKILL.md` | Trigger description, decision flow, choice matrix, intensity contract, boundaries, completion rule |
| `REFERENCE.md` | Entrypoint selection, style profiles, surface guidance, implementation rules, verification matrix |
| `EXAMPLES.md` | Verified root, TurbScript, DOM, Electron main, interaction, and surface integration patterns |
| `WORK-ARTIFACTS.md` | Portable artifact ownership, layout, lifecycle, and public-documentation boundary |
| `catalog.json` | Machine-readable published entrypoints and intensity levels |
| `templates/` | Stable work index, decisions, plan, and implementation-report structures |
| `scripts/inspect-project.mjs` | Read-only package-manager, framework, TypeScript, Electron, scripts, and existing-version discovery |

At the package level, `npm run skills:check` validates the skill frontmatter, required portable files, artifact headings, catalog-to-package-export parity, intensity levels, and inspector execution. `npm run docs:check` validates its Markdown links and terminology. `npm run verify:package` confirms the skill is present in the actual npm tarball.

## Verification expectations

The integration is not complete merely because compilation succeeds. The skill requires applicable evidence for normal and reduced endpoints, interruption/retargeting, teardown, idle scheduling, responsive behavior, inputs/focus, process isolation, resource cleanup, console health, and regression gates. Any row that cannot be exercised is recorded as `UNVERIFIED`, not silently treated as passing.
