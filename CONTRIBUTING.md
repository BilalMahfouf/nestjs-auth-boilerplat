# Contributing Guide

Thanks for considering contributing to this project.

This template exists to save developers from repeating the same backend setup work. Your contribution helps make it faster, safer, and easier for everyone.

## Why Contribute

- You help other teams ship faster.
- You improve real developer experience, not just code.
- You can fix bugs you personally hit.
- You can shape the template standards used in future projects.

## Who Should Contribute

Everyone is welcome.

- Beginners can improve docs, examples, and error messages.
- Backend developers can add features, tests, and refactors.
- QA-minded contributors can improve reliability and test coverage.

If you found an issue, you are already the right person to help improve it.

## Ground Rules

- Keep changes focused and small.
- Prefer clear code over clever code.
- Add or update tests for behavior changes.
- Do not include secrets or credentials.
- Be respectful in discussions and reviews.

## Quick Contribution Flow

1. Fork the repository.
2. Create a branch from main.
3. Make your change.
4. Run lint and tests locally.
5. Open a Pull Request with a clear description.

## Local Setup

From the backend directory:

```bash
cd backend
pnpm install
cp .env.example .env
pnpm run db:init
pnpm run start:dev
```

Swagger docs will be available at:

- http://localhost:3000/api/docs

## Create a Good Branch

Use a descriptive branch name:

- feat/add-email-provider
- fix/refresh-token-expiry-check
- docs/improve-readme-setup
- test/add-payments-integration-cases

## Commit Message Style

Use short, explicit messages:

- feat: add Stripe payment service adapter
- fix: handle missing idempotency key in checkout
- docs: improve environment setup instructions
- test: add integration test for refresh token rotation

## Reporting Issues

When opening an issue, include:

- What happened
- What you expected
- Reproduction steps
- Logs or screenshots if relevant
- Environment details (Node version, OS, DB, Docker)

Good issue titles:

- "Refresh token rotation fails when session is expired"
- "db:init fails when database user lacks create privilege"

## Picking an Issue to Fix

- Start with small, reproducible bugs.
- Comment on the issue so others know you are working on it.
- Ask questions early if requirements are unclear.

## Pull Request Checklist

Before opening a PR, run:

```bash
cd backend
pnpm run lint
pnpm run test:unit
pnpm run test:integration
```

If Docker is unavailable locally, mention it in your PR and run at least:

```bash
cd backend
pnpm run lint
pnpm run test:unit
```

Your PR should include:

- What changed
- Why it changed
- How it was tested
- Any migration or env changes

## Code Expectations

- Follow existing NestJS module and feature-handler patterns.
- Keep API behavior explicit and documented.
- Reuse existing error patterns for consistent responses.
- Prefer migration-first database changes.

## Documentation Expectations

Update docs when your change affects:

- API routes or payloads
- Environment variables
- Setup or run commands
- Architecture or flow behavior

## Security Issues

Do not open a public issue for sensitive vulnerabilities.

Share details privately with repository maintainers first.

## Review and Merge

A good PR is:

- Small enough to review quickly
- Covered by tests
- Clear about behavior changes
- Backward-compatible when possible

Maintainers may request changes before merge. That is normal and part of quality control.

## First Contribution Ideas

- Improve error message clarity
- Add missing API docs examples
- Add unit tests for edge cases
- Improve developer setup instructions
- Add payment provider adapter behind the payment service interface

## Thank You

Every contribution improves this template for the next team.

Whether you fix one typo or ship a full feature, it matters.
