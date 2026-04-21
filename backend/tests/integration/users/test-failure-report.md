# Users Integration Tests Failure Report

## Status
- Command: `pnpm exec jest --rootDir . --testRegex "tests/integration/.*\\.integration-spec\\.ts$" --runInBand`
- Result: PASS
- Suites: 3 total
- Tests: 17 total, 17 passed, 0 failed

## Failing Tests
- None currently.

## Previous Root Cause
The app uses global validation with whitelist mode in `src/main.ts`:
- `whitelist: true`

Several endpoint DTOs have no validation decorators, so request body properties are stripped before reaching handlers. That causes handlers to receive `undefined` values.

## Applied Fix
Class-validator decorators were added to DTO properties used by HTTP endpoints so whitelist mode retains required fields.

### Updated DTOs
- `src/modules/users/features/auth-register.feature.ts` (`RegisterCommandDto`)
- `src/modules/users/features/auth-login.feature.ts` (`LoginCommandDto`)
- `src/modules/users/features/auth-forget-password.feature.ts` (`ForgetPasswordCommandDto`)
- `src/modules/users/features/auth-reset-password.feature.ts` (`ResetPasswordCommandDto`)
- `src/modules/users/features/users-change-password.feature.ts` (`ChangePasswordCommandDto`)
- `src/modules/users/features/users-update-profile.feature.ts` (`UpdateUserProfileCommandDto`)

## Outcome After Fix
- All users integration suites pass.
- All users integration tests pass.
