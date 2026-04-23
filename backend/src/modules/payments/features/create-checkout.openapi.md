# Create Checkout OpenAPI Handoff

Endpoint: POST /api/v1/payments/checkout

This endpoint requires a valid access token in the Authorization header and a mandatory `idempotency-key` header, and it does not accept userId in the body. Frontend should send amount as a positive number with at most two decimal places and currency as a 3-letter uppercase code like USD. On success, the API returns 201 with paymentId, Pending status, provider values, and idempotencyKey for request tracing. If the token is invalid, the API returns 401; if the idempotency header is missing or body validation fails, it returns 400; and if the user record no longer exists, it returns 404. For 500 responses, frontend should show a retry-safe error state and allow the user to attempt checkout again.
