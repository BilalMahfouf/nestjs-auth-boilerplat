---
name: qa-spec-reporter
description: "QA-first test workflow with strict spec naming, method-level coverage, and failure triage reporting."
argument-hint: "Describe the class or feature to test"
---

# QA Spec Reporter

Use for test-first or test-alongside delivery.

## Rules
- Naming: {ClassName}.spec.ts.
- Write tests before or alongside implementation.
- Per public method, cover happy path, edge cases, and one failure case.
- Test name format: should [behavior] when [condition].

## Failure Triage
- If a test is wrong, fix the test only.
- If logic is wrong, do not edit source code.
- Generate {ClassName}Report.md beside the spec with:
  - Failed tests table (expected vs actual, severity)
  - Root cause
  - Affected file and line
  - Fix suggestion
  - Regression risk
