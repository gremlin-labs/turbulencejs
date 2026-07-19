# Work artifact contract

This portable contract is inspired by the gremlin-skills convention but has no external dependency.

## Root resolution

Before writing, inspect applicable agent instructions and workspace manifests. If the target is a registered child repository, use the owning workspace's existing `agent-work/` root. Otherwise use the target repository root. If ownership is ambiguous and internal files could land in a public child, ask one focused question.

## Layout

```text
agent-work/
  {stable-kebab-case-slug}/
    WORK.md
    turbulencejs-integration/
      DECISIONS.md
      INTEGRATION-PLAN.md
      IMPLEMENTATION-REPORT.md
      NOTES.md                 # optional
```

Use one stable slug for the complete selection and implementation. Never create new type-first roots such as `plans/`, `audits/`, or `goals/`. Do not overwrite a conflicting slug; determine whether it is the same initiative first.

## Ownership

The skill writes only inside its `turbulencejs-integration/` stage and the shared slug-level `WORK.md`. Preserve artifacts from other stages. Link rather than copy sibling evidence.

`WORK.md` must contain: `Outcome`, `Ownership`, `Status`, `Stages`, `Current handoff`, `Decisions and material deltas`, and `Final evidence`. Use lifecycle status `ACTIVE`, `COMPLETE`, `BLOCKED`, `ABANDONED`, or `SUPERSEDED`.

## Public documentation boundary

`agent-work/` is execution history, not the sole source of current product behavior. Put lasting installation, API, architecture, accessibility, and operations knowledge in the target project's normal reader-facing docs. The implementation report cites those updates.

## Completion

The stage is complete when required artifacts exist, relative links resolve, the approval record is truthful, `WORK.md` is current, relevant verification passes, and no new legacy artifact root was created.
