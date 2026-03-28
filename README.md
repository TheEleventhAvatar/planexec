# PlanExec

**PlanExec** is a planner-driven agentic workflow execution engine designed to explore how AI systems should run reliably in production.lol

Instead of chaining LLM calls, PlanExec separates **reasoning** from **execution** and treats workflows as **durable, observable systems** with retries, failure handling, and persistent state.

---

## 🧠 Core Idea

Most AI applications fail not because models are weak, but because execution is fragile.

PlanExec is built around one principle:

> Use AI where reasoning matters (planning),  
> keep execution deterministic, retryable, and debuggable.

---

## 🏗️ Architecture Overview

PlanExec follows a **planner → orchestrator → agents** architecture:

1. **Planner Agent**
   - Converts a high-level goal into a structured execution plan (JSON contract)
   - Defines ordered steps, agent types, and expected outputs

2. **Workflow Orchestrator**
   - Persists workflow and step state
   - Executes steps sequentially
   - Handles retries with exponential backoff
   - Supports pause / abort without corrupting state
   - Propagates failures safely

3. **Execution Agents**
   - Stateless agents that execute individual steps
   - Receive full context from persisted workflow state
   - Return structured outputs for downstream steps

4. **Supporting Agents**
   - Critic Agent: validates outputs and detects failures
   - Memory Agent: persists and retrieves contextual data
   - Research Agent: enriches execution with external context

---

## 🔁 Workflow Lifecycle

1. User submits a goal
2. Planner agent generates an execution plan
3. Plan is materialized into durable workflow steps
4. Steps execute sequentially with retry handling
5. Outputs are tracked and visualized in real time
6. Workflow completes, fails, or pauses safely

---

## 📊 Observability

PlanExec includes a **timeline-based UI** that visualizes:
- Step-by-step execution
- Agent type per step
- Inputs and outputs
- Retry attempts and backoff
- Workflow status (running / paused / failed / completed)

This makes long-running workflows easy to debug and reason about.

---

## 🧩 Key Design Decisions

- **Planner-only intelligence**  
  Execution agents are intentionally non-creative to keep workflows deterministic.

- **Durable state first**  
  All workflows and steps are persisted to allow retries, recovery, and inspection.

- **Agent contracts**  
  All agents implement a shared base interface, making them swappable and extensible.

- **Retry-aware execution**  
  Failures are expected and handled explicitly with capped exponential backoff.

---

## 🛠️ Tech Stack

- TypeScript
- React + Vite
- Supabase (PostgreSQL)
- Modular agent-based architecture
- Async workflow orchestration

---

## 🚀 Live Demo

👉 https://planexec.lovable.app/

---

## 📌 Motivation

PlanExec was built as a learning-focused system to understand:
- workflow orchestration
- failure handling in AI systems
- separation of planning and execution
- why production AI is more about systems than prompts

---

## 🔮 Future Improvements

- Step-level idempotency keys
- Conditional branching in workflows
- Human-in-the-loop approvals
- Streaming execution logs
- Multi-user workflow isolation

---

## 📜 License

MIT
