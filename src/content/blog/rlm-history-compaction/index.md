---
title: "RLM Is Not Automatically Token-Efficient"
publishDate: 2026-07-17
description: "History thrash can erase RLM cell savings; compaction plateaus input tokens without fixing write thrash alone."
tags:
  - rlm
  - tokens
  - history
  - compaction
  - agents
language: "English"
draft: false
---

**Thesis.** “Recursive” agent loops are often sold as a path to *working longer without stuffing the whole world into one prompt*. That can be true for **task structure**. It is **false by default** for **token burn**: if each model call re-sends a growing dialog of observations and tool traces, input tokens climb nearly monotonically. Efficiency is a **history policy**, not a free property of recursion.

Dogfood evidence (2026-07-17, multi-fence model, security-review style runs): with history compaction, per-call input **plateaued ~14–16k** instead of climbing toward **~50–67k**, and total tokens for a **25-step stop** fell from **~1.04M to ~367k** (~2.8×). The cheaper run still **did not** produce the review file.

## Context

A recursive RLM loop iterates: model → code cells → observation → model… Operators watching live runs asked a sharp question: *why is token usage increasing monotonically? Isn’t RLM supposed to be token efficient? Should we show input and output separately?*

Those questions split three confusions:

1. **Recursion depth** (sub-calls / nested RLM) vs **dialog length** at one depth.
2. **Total tokens** vs **per-call input** (the quantity that makes each step more expensive).
3. **Efficiency of reasoning** vs **efficiency of memory encoding**.

This note addresses (2) and (3) with monitor series from a thrash run and a compaction-enabled re-run. Companion pieces:

- [Smaller cells A/B](/blog/rlm-small-cells) — cell policy ≠ completion.
- [Execution strategies](/blog/rlm-execution-strategies) — history caps live on named presets (`history_keep_recent_turns`, `history_max_total_chars`, …).

## What “monotonic growth” looked like

Without an effective working-set policy, each turn appends:

- assistant prose and fences,
- tool/REPL observations (file dumps, errors, logs),
- prior user/system scaffolding.

The next call’s **input** includes most of that history. Output may stay modest (hundreds to a few thousand tokens) while **input** becomes the bill.

**Observation (session monitor, thrash run):** late calls approached **~50–67k input tokens**; cumulative total on a 25-step stop was on the order of **~1.04M** tokens (~999k in / ~43k out).

**Observation (compaction re-run):** after an early climb, per-call input **held ~14–16k** (series ending near `12867, 16272, 13357, 16672, 13710, 13882, 14010`); cumulative **~367k** total (~340k in / ~28k out) at the same step ceiling.

![Per-call input trajectories](./per-call-input-tokens.svg)

*Figure: thrash late points are schematic midpoints from monitor notes (not a full exported series); compacted series follows the live plateau description. Use for shape, not millimetric accuracy.*

![Total token comparison at 25-step stop](./total-tokens-comparison.svg)

*Figure: same stop condition (`max_iterations` / steps), very different bill — driven by input.*

## Core argument

### 1. RLM efficiency is a policy surface

A recursive loop gives you **places to intervene**:

| Knob (strategy YAML) | Role |
|----------------------|------|
| `history_keep_recent_turns` | Full fidelity window |
| `history_max_chars_per_old_message` | Truncate older turns |
| `history_max_total_chars` | Hard working-set ceiling |
| `history_protect_prefix_messages` | Keep system/task head intact |
| `max_observation_chars` | Bound what a single tool result injects |

These are implemented as history-memory compaction applied before each model call (config knobs on the strategy object; defaults in `rlm_config.yaml`).

**Inference:** if you ship RLM with unbounded dialog concatenation, you have built a **linear input escalator**, not an efficient long-horizon agent.

### 2. Report input and output separately

Session operators correctly pushed for **in/out split**. Totals hide the failure mode:

| View | What you miss |
|------|----------------|
| Total only | Whether cost is “thinking” or “re-reading” |
| Output only | Looks fine while input explodes |
| Input per call | Shows plateau vs climb — the health metric |

Scoreboards and live monitors should treat **last-call input** and **hist_chars under budget** as first-class series.

### 3. Token wins do not imply task wins

The compacted run was **~2.8× cheaper** and kept **hybrid cell discipline** healthy — yet stopped at **25/25 steps** with **no FINAL** and **`files_changed: []`**. Monitor notes show the model stuck on **write mechanics** (triple-quoted report cells → parse errors; chunked `open`; bash heredoc) while input stayed flat.

So compaction fixed the **wrong bottleneck relative to the operator’s hope for a finished review**, but the **right bottleneck relative to the token question**. Both statements can be true.

## Worked example (reading a live monitor)

Hypothetical line from a healthy compacted turn:

```text
turn 14  in≈16.3k  out≈1.5k  hist_chars≈51k/64k  tools 36/1000  file? no
```

Interpretation checklist:

1. **in flat** → memory policy holding.
2. **out modest** → not “novel-writing” the whole report into chat (or failing while trying).
3. **file? no** after many “about to write” turns → success metric is still red; **do not extend budget expecting tokens to be the issue.**

Contrast thrash:

```text
turn 14  in≈55k+  out≈2k  hist growing  tools climbing  file? no
```

Here extend-or-kill decisions should prioritize **history policy and re-scan behavior**, not only more steps.

## Counterfactuals and alternatives

1. **If RLM were token-efficient by construction,** per-call input would stay roughly constant as turns increase under a fixed task. The thrash series falsifies that for an uncompacted dialog loop.

2. **Alternative to truncation:** externalize state into the REPL workspace (files, variables) and keep dialog thin by design. Compaction is a **runtime-side** mitigation when the model keeps stuffing observations into chat history instead of files.

3. **Aggressive summarization counterfactual:** replace old turns with LLM summaries. Might save more tokens but risk losing error strings needed to stop write thrash — a different tradeoff, not measured here.

4. **What would reverse the ~2.8× win?** Disable history caps with the same model and task length; expect input climb and totals back toward thrash order-of-magnitude. **Provisional** without a controlled re-disable A/B on identical seeds.

## Limitations

- Thrash late-call series in the figure is **reconstructed from monitor narrative**, not a full CSV export; magnitudes match session notes, exact per-turn list may differ.
- Both runs hit a **step ceiling without deliverable**; token comparison is for **same stop**, not same success.
- Compaction parameters (`keep_recent_turns`, caps) were those of the exploratory/default strategy path in flight that day — not a full grid search.
- Does not measure nested recursive depth costs separately from root dialog length.
- Write-path failure modes deserve their own note; they are only a boundary condition here.

## Takeaways

1. **Assume dialog RLM will grow input until you stop it.** Ship history working-set knobs on day one.
2. **Dashboard in and out separately**; watch per-call input plateau.
3. **Token health ≠ task health.** Pair token series with artifact checks (`files_changed`, review path exists).
4. **Strategy binding** should include history caps alongside cell/tool budgets — see [strategies article](/blog/rlm-execution-strategies).
5. **Next measurement:** export full per-call in/out from `model_invocations` for thrash vs compact runs into a checked-in CSV so figures need no schematic fill.
