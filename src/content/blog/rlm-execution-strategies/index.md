---
title: "Strategies, Not Model Ifs"
publishDate: 2026-07-17
description: "Named YAML strategy presets beat model-id ifs: cell budgets, history caps, and hybrid phases on one object."
tags:
  - rlm
  - architecture
  - strategies
  - yaml
  - profiles
  - agents
language: "English"
draft: false
---

**Thesis.** When two models share one recursive agent loop, a single default policy will punish at least one of them. The fix is not `if "vendor" in model:` inside the engine. The fix is **named, data-driven execution strategies** (how the loop runs), optionally **bound from profiles** (who runs), and always **overridable per task**.

This article records the architecture that came out of recursive-agent dogfooding on 2026-07-17: live multi-fence multi-cell burn, one-cell-friendly disciplined convergence, broken HITL extends when tool budgets were not on the ledger, and the decision to make approaches first-class YAML.

## Context: one loop, two behaviors

| Behavior | Example from dogfood | Failure under one-size defaults |
|----------|----------------------|----------------------------------|
| One cell / turn, converges | single-cell-friendly model, tiny plan | Works near modest `max_tool_calls` |
| Many cells / turn, exploratory | multi-fence model, long security review | Burns cell/tool budget in few turns; extending *root steps* does nothing |

Operators asked: *maybe different approaches are needed for different models — do we need that flexibility?*

Yes — with a constraint: **flexibility of approaches**, not special cases hardwired to vendor strings.

Empirical companions:

- [Small cells A/B](/blog/rlm-small-cells) — prompting changes cell shape; horizon still decides completion.
- [Token / history note](/blog/rlm-history-compaction) — history caps belong on the same strategy object as cell/tool limits.

## Separation of axes

| Axis | File / module | Meaning |
|------|---------------|---------|
| **Who** | `profiles.yaml` (profile registry) | provider + model (+ optional default strategy id) |
| **How** | `rlm_config.yaml` (strategy registry) | iterations, tool/model caps, cells/turn, prompt style, history, addons |

Resolution (highest wins **per key**):

```text
task.metadata[key]
  >  task.metadata.rlm_config_id  (named preset)
  >  profile.rlm_config_id        (convenience default)
  >  AGENT_RLM_CONFIG / "default"
```

![Resolution priority](./resolution-priority.svg)

*Figure: rank only — task keys always beat profile-bound presets.*

### Why not model `if`s

1. **New models appear weekly.** Engine forks rot.
2. **Same model, different jobs.** A short probe wants multi-block batching; a long review wants hybrid discipline ([A/B note](/blog/rlm-small-cells)).
3. **Tests and evals** need pure strategy diffs without swapping weights.
4. **Operators** can add presets without shipping Python.

## Named presets (shipped shape)

From `rlm_config.yaml` (abridged intent):

| Preset | Intent | Typical binding |
|--------|--------|-----------------|
| `default` | Conservative shared baseline | env / fallback |
| `disciplined` | One-cell-friendly, tighter output | single-cell-oriented profiles |
| `exploratory` | High tool headroom, multi-cell OK, hybrid late phase, write-early nudge | multi-fence profiles |

![Preset budget comparison](./preset-budgets.svg)

*Figure: `max_cells/turn` of 0 means **no hard cap** (`null` in YAML) for `default`.*

Illustrative YAML:

```yaml
# rlm_config.yaml
configs:
  default:
    max_tool_calls: 200
    max_model_calls: 40
    max_code_blocks_per_turn: null
    prompt_style: multi_block
    history_keep_recent_turns: 6
    history_max_total_chars: 80000

  disciplined:
    max_tool_calls: 200
    max_code_blocks_per_turn: 1
    prompt_style: single_block
    history_max_total_chars: 60000

  exploratory:
    max_tool_calls: 1000
    max_code_blocks_per_turn: 12
    hybrid_switch_after_turns: 3
    late_max_code_blocks_per_turn: 4
    prompt_style: multi_block_budgeted
    system_prompt_addon: >-
      Prefer batched reads; write findings early under /workspace/reviews/;
      after orientation, fewer smaller cells and FINAL soon.
```

```yaml
# profiles.yaml (bindings)
single-cell-model:
  provider: gateway
  model: vendor/single-cell-model
  rlm_config_id: disciplined

multi-fence-model:
  provider: gateway
  model: vendor/multi-fence-model
  rlm_config_id: exploratory
```

Task authors still win:

```yaml
agent:
  profile: multi-fence-model
metadata:
  rlm_config_id: disciplined   # force different approach
  max_tool_calls: 500          # one-off key override
```

## Strategy knobs that earned their place

| Knob | Why dogfood forced it |
|------|------------------------|
| `max_tool_calls` / `max_model_calls` | Real stop reasons; must seed **ledger** so HITL extend doubles the limit that actually fired |
| `max_code_blocks_per_turn` | Soft prompt styles leak on turn 0; engine can execute first N and note deferred cells |
| `prompt_style` | `single_block` / `multi_block` / `multi_block_budgeted` fragments — data, not prompt forks of the whole system string |
| `system_prompt_addon` | Write-early and budget-finite steers without new code paths |
| Hybrid late phase | Explore with higher cell cap, then tighten + nudge (long multi-fence reviews) |
| History working set | Prevent input escalators ([token article](/blog/rlm-history-compaction)) |

### Ledger honesty (ops requirement)

A recurring failure mode: engine stops on **`max_tool_calls`**, HITL “extend budget” raises **root steps** or unset ledger rows, warm-continue changes nothing useful.

Strategy work only becomes operationally real when:

1. Limits from the resolved strategy are **seeded** on the budget ledger (not `None`).
2. Actual tool/model counts are **settled** each invocation.
3. Warm-continue **grants remaining** against the raised ceiling (same pattern as iteration grants).
4. Gates surface **`exhaustion_reason`** so operators know which knob tripped.

Without (1–4), “exploratory with 1000 tool calls” is a paper policy.

## Worked example

**Scenario A — short multi-fence probe.** Binding `exploratory` may be wrong: high cell freedom + short steps can still finish (see multi-block A arm), but if you want comparable cell discipline for measurement, set `metadata.rlm_config_id: disciplined` or prompt-only single_block as in the A/B — **knowing** completion risk rises.

**Scenario B — long multi-fence review.** Profile default `exploratory` gives tool headroom + hybrid late nudge + history caps. Operator sees `exhaustion_reason=max_tool_calls` → extend **tool** budget, not steps alone.

**Scenario C — single-cell-friendly implement.** Profile `disciplined` keeps one-cell cadence; task can still raise `max_iterations` without rewriting engine code.

## Counterfactuals

1. **If one global default were enough,** multi-fence multi-cell burn and single-cell success would both be well-served by `max_tool_calls≈100` and multi-block prompts. Dogfood showed they are not.

2. **Alternative design: auto-tune from telemetry.** Out of scope for this change set; strategies remain **operator-declared**. Auto-tune would still need a strategy representation like this YAML.

3. **Alternative: per-provider adapter forks.** Multiplies code paths; fails the “same agent stack, many models” goal.

4. **Falsifier for the architecture:** a required behavior that cannot be expressed as strategy keys without reading `model` in the engine. None appeared in this design pass; cell caps, prompts, history, and budgets covered the dogfood gaps.

## Limitations

- Preset numbers (`1000` tools, `12` cells, hybrid after 3) are **starting points** from one dogfood week, not optimized frontiers.
- Profile → strategy binding is a **convenience**; mis-bound profiles can silently change cost envelopes — document defaults in run config snapshots.
- Hard cell caps can surprise models that planned later fences; deferred observation text must stay explicit (turn-discipline spec extension).
- This article does not claim the exploratory hybrid **fixed deliverable writes**; compaction + hybrid improved token/cell behavior while write thrash remained ([token note](/blog/rlm-history-compaction)).

## Takeaways

1. Split **who** (profile) from **how** (rlm_config strategy).
2. Encode approaches in **YAML**; resolve with a clear override stack; **never** branch the engine on model id strings.
3. Put every enforced limit on the **ledger** or HITL will lie.
4. Include **history** and **cell** policy in the same strategy object — they interact with tool budgets.
5. Use task metadata when the job’s horizon disagrees with the model’s default personality ([small cells](/blog/rlm-small-cells)).
