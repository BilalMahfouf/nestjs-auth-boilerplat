---
name: openapi-endpoint-doc-gate
description: "Backend endpoint documentation gate using Swagger OpenAPI 3.0 plus frontend handoff notes; block shipping when incomplete."
argument-hint: "Describe the endpoint to document"
---

# OpenAPI Endpoint Doc Gate

Use for backend endpoint implementation and review.

## Required OpenAPI Block
For every endpoint, add a Swagger OpenAPI 3.0 block containing:
- summary and description
- full request schema: method, path, params, headers, body (types + validation)
- responses: 200/201 with example, 400 with triggering fields, 401 auth reason, 403 denied condition, 404 missing resource, 500 internal failure
- side effects: DB writes, events emitted, external calls

## Frontend Handoff
After the block, write 3-5 plain-English sentences for frontend developers explaining request expectations, auth needs, success result, and failure handling.

## Shipping Rule
No endpoint ships without both the OpenAPI block and frontend handoff note.
