---
title: "From REPL Loops to Swarms: Leasing Sandboxed Containers"
description: "Designing SwarmLeaseManager to lease container worker nodes dynamically for concurrent file inspection and sub-task execution."
publishDate: "2026-05-07"
updatedDate: "2026-05-07"
tags:
  - orchestration
  - swarm
  - parallelization
  - docker
  - architecture
heroImage: { src: "./cover.png", alt: "From REPL Loops to Swarms: Leasing Sandboxed Containers" }
draft: false
comment: true
---

Imagine hiring a team of researchers, but forcing them all to share a single laptop. One reads a file, closes it, then the next person takes their turn. It’s slow, inefficient, and bottlenecks the entire team. In the world of AI agents, relying on a single, sequential REPL (Read-Eval-Print Loop) container for complex repository analysis creates the exact same bottleneck.

In this article, we explore how our orchestration framework solves this problem by moving from sequential execution to a parallelized **Swarm Architecture** using the `SwarmLeaseManager`. 

---

## 1. The Single-Container Bottleneck

Traditional LLM agent harnesses spin up a single Docker container for the agent's Python REPL. The agent reads a file, waits for the result, executes a grep search, waits for the result, and slowly piece-meals its understanding of the codebase. 

While this works for simple scripts, analyzing a massive enterprise repository or executing a test suite while simultaneously checking logs requires concurrency. If an agent wants to `grep_search` across five different sub-packages, doing so sequentially burns precious time (and API window duration).

---

## 2. Enter the SwarmLeaseManager

To enable parallel execution without sacrificing sandbox security (like our [Zero Net Access](/blog/zero-net-access-agent-sandboxing) posture), we implemented the `SwarmLeaseManager`. 

Instead of a single REPL, the host orchestrator manages a pool of isolated worker containers. When the root agent decides it needs to parallelize a task, it requests "leases" from the manager.

![Swarm Architecture](./swarm-architecture.png)

### How Leasing Works

The `SwarmLeaseManager` dynamically allocates worker nodes with strict lifecycle rules:

```python
# orbit_harness/orchestration/swarm.py
class SwarmLeaseManager:
    def acquire_lease(self) -> SwarmWorkerLease | None:
        self.reclaim_expired_leases()
        active_count = sum(1 for l in self.leases.values() if l.active)
        if active_count >= self.max_workers:
            return None # Swarm pool is full

        lease_id = f"lease_{uuid.uuid4().hex[:8]}"
        worker_id = f"worker_node_{uuid.uuid4().hex[:8]}"
        lease = SwarmWorkerLease(lease_id=lease_id, worker_node_id=worker_id)
        self.leases[lease_id] = lease
        return lease
```

1. **Acquisition:** The orchestrator requests a lease. If under the concurrency limit (`max_workers`), a new `SwarmWorkerLease` is generated and a sandboxed Docker container is spun up.
2. **Heartbeats:** To prevent zombie containers from hogging resources, workers must send regular heartbeats (`heartbeat(lease_id)`).
3. **Reclamation:** If a worker crashes or hangs (failing to send a heartbeat within `ttl_seconds`), the manager automatically reclaims the lease (`reclaim_expired_leases()`) and destroys the rogue container.

---

## 3. Parallel Dispatch in Action

With the lease manager active, our orchestration framework can use `asyncio` to dispatch tasks across the swarm concurrently. 

```python
async def dispatch_parallel_swarm_tasks(
    tasks: list[Callable[[], Coroutine[Any, Any, Any]]],
    max_concurrency: int = 4,
) -> list[Any]:
    semaphore = asyncio.Semaphore(max_concurrency)

    async def _run_one(task_fn: Callable[[], Coroutine[Any, Any, Any]]) -> Any:
        async with semaphore:
            return await task_fn()

    return await asyncio.gather(*[_run_one(t) for t in tasks], return_exceptions=True)
```

By wrapping execution in an `asyncio.Semaphore`, the orchestrator ensures we never exceed our leased worker count, smoothly distributing tasks like parallel test runs, concurrent static analysis, or multi-directory `grep_search` operations.

---

## 4. Key Takeaways

1. **Break the REPL Loop:** Sequential tool execution is a major latency bottleneck for complex agents.
2. **Leased Isolation:** Dynamically leasing containers ensures that concurrent tasks remain isolated from one another, preventing filesystem collisions during parallel testing.
3. **Heartbeats are Mandatory:** Always implement TTLs (Time-to-Live) and heartbeats when orchestrating Docker containers to prevent zombie processes from hanging the host machine.
