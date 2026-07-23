---
title: "Catching Hallucinated Paths: Quality Intercepts"
description: "How pre-finalization trajectory hooks catch ungrounded file paths and trigger self-correction turns before final answer submission."
publishDate: "2026-07-04"
updatedDate: "2026-07-04"
tags:
  - plan-quality
  - grounding
  - evaluation
  - trajectory-repair
  - validation
heroImage: { src: "./cover.png", alt: "Catching Hallucinated Paths: Pre-Finalization Quality Int..." }
draft: false
comment: true
---

Imagine an AI agent confidently handing you a finished architectural plan. It looks perfect, the logic is sound, and the syntax is flawless. But when you go to implement it, you realize the agent cited a file path that doesn't exist. The plan is hallucinated.

This is a pervasive issue in agentic planning. To combat it, our orchestration framework implements **Pre-Finalization Quality Intercepts**—a system that catches hallucinated paths *before* the agent is allowed to finalize its trajectory.

---

## 1. The Anatomy of a Hallucination

When an agent analyzes a complex repository, it builds a mental model of the directory structure. Because LLMs are predictive text engines, they will often guess where a file *should* be based on common conventions. 

For example, an agent might propose edits to `src/utils/logger.py`, completely unaware that the project actually stores its logging module in `pkg/telemetry/logging.py`. If the agent finalizes its plan with the hallucinated path, the entire run is a failure, regardless of how elegant the proposed code is.

---

## 2. The Pre-Finalization Intercept

To solve this, we cannot rely on the agent checking its own work. We must introduce a host-side validation gate right before the agent calls its `submit_plan` or `finalize` tool.

![Quality Intercept Architecture](./intercept.png)

1. **The Hook:** When the agent attempts to submit its final artifact, the orchestrator intercepts the payload.
2. **Path Grounding Check:** The host parses the artifact for any referenced file paths, code snippets, or module names. It then physically verifies these references against the actual filesystem and AST (Abstract Syntax Tree) of the repository.
3. **The Bounce:** If a path does not exist, the orchestrator rejects the submission. Instead of ending the run, it sends an error back to the agent: `"Error: Proposed file src/utils/logger.py does not exist. Please use search tools to verify paths."`

---

## 3. Forcing Self-Correction

By bouncing the submission, the intercept forces the agent into a **Trajectory Repair Loop**. The agent must spend a turn using tools like `grep_search` or `list_dir` to ground its mental model in reality. 

This turns a silent, 0% quality failure into a slightly longer, but 100% grounded success. The intercept acts as an automated reviewer, ensuring that no hallucinated plans make it to the user.
