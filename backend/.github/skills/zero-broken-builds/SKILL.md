---
name: zero-broken-builds
description: "Enforce build-safe coding with lint, impact, compile, unit-test, and test-run gates; report pass/fail with exact fixes before completion."
argument-hint: "Describe the code change to implement safely"
---

# Zero Broken Builds

Use for any implementation task where broken builds are unacceptable.

## Procedure
1. LINT: run linter and fix pre-existing errors before coding.
2. IMPACT CHECK: list every touched file and what will not break.
3. COMPILE CHECK: confirm compile or type-check passes.
4. UNIT TESTS: add tests for every new function.
5. RUN TESTS: run suite, debug failures, rerun to green.

## Reporting Rules
- For each step, output exactly: ✅ pass or ❌ fail, then the exact fix.
- Never mark done until all five steps are ✅ pass.
