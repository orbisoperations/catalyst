# Project Style Guide

This document defines the coding conventions for this project to maximize maintainability, testability, extensibility, and team development velocity.

---

## General Principles

- Use English for all code, comments, and documentation.
- Always declare types for variables, parameters, and return values.
- Avoid using `any`; define explicit types as needed.
- Use TSDoc for public classes and methods.
- Avoid unnecessary blank lines within functions.
- Prefer **one export per file** unless a module is a function library.
- Write clean, elegant, and purpose-driven code.

---

## Naming Conventions

| Element                       | Convention   | Example                  |
| :---------------------------- | :----------- | :----------------------- |
| Classes                       | `PascalCase` | `UserService`            |
| Variables, Functions, Methods | `camelCase`  | `fetchUser`, `isLoading` |
| Files, Directories            | `kebab-case` | `user-service.ts`        |
| Environment Variables         | `UPPERCASE`  | `DATABASE_URL`           |

- Functions start with a **verb** (`fetchData`, `saveUser`).
- Boolean variables use verbs (`isLoading`, `canDelete`).
- Prefer full words over abbreviations (except for common ones like `API`, `URL`, `ctx`, `err`, `req`, `res`, `next`).
- Loop variables (`i`, `j`) are acceptable for short loops.

---

## Functions

- Functions should have **a single purpose** and be **short** (≤ 20 instructions).
- Avoid deep nesting:
    - Use **early returns** for error handling.
    - Extract logic to **small utility functions**.
    - Use **higher-order functions** (`map`, `filter`, `reduce`) when appropriate.
- Use **arrow functions** for simple logic (≤ 3 instructions), otherwise prefer **named functions**.
- Use **default parameter values** instead of manually checking for `null` or `undefined`.
- Apply **RO-RO (Receive an Object, Return an Object)** pattern for multiple parameters and outputs.

---

## Data Practices

- Prefer **composite types** over raw primitives for structured data.
- Encapsulate validation logic inside classes.
- Favor **immutability**:
    - Use `readonly` for non-changing properties.
    - Use `as const` for literal values.

---

## Classes

- Adhere to **SOLID principles**.
- Prefer **composition over inheritance**.
- Define clear **interfaces** for contracts.
- Keep classes **small and focused**:
    - ≤ 200 instructions
    - ≤ 10 public methods
    - ≤ 10 properties

---

## Error Handling

- Throw exceptions only for **unexpected errors**.
- When catching exceptions:
    - **Fix** recoverable issues.
    - **Add meaningful context** to errors.
    - Otherwise, allow global error handling to manage it.

---

## Testing

- Follow **Arrange-Act-Assert** pattern inside tests.
- Use clear variable naming:
    - `inputX`, `mockX`, `actualX`, `expectedX`.
- Write **unit tests** for each **public function**.
- Use **test doubles** (mocks, stubs) for expensive or complex dependencies.
- Write **acceptance tests** at the module level.
- Use **Given-When-Then** naming and structure for acceptance tests.

---

## Code Organization

- Structure by **features first**.
- Shared, reusable code should be **lifted to dedicated libraries/modules**.
- Minimize tight coupling between modules.

---

## Tooling and Automation

- Code is linted and formatted automatically using [XO](https://github.com/xojs/xo).
- Type checking is enforced with `tsc --noEmit`.
- Tests are run with `bun test`.
- All code must pass linting, type checking, and tests before submission.
- Small, logically-scoped commits are preferred for version control.
- Stacked PRs should be squashed using `gt submit --autosquash`.

---

# ✨ Engineering Mindset

> Write code for the next engineer who has to maintain it — clarity, correctness, and simplicity over cleverness.

---
