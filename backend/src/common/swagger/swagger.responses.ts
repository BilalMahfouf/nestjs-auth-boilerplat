import { HttpStatus, applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiResponse,
} from '@nestjs/swagger';

export const SWAGGER_BEARER_AUTH_NAME = 'access-token';
export const SWAGGER_REFRESH_COOKIE_AUTH_NAME = 'refresh-token-cookie';

type ErrorResponseDoc = {
  status: HttpStatus;
  description: string;
  code: string;
  message: string;
};

export const UsersErrorDocs = {
  userNotFoundByEmail: {
    status: HttpStatus.NOT_FOUND,
    description: 'No account exists for the supplied email.',
    code: 'User.NotFound',
    message: 'User with email doctor@example.com is not found',
  } as const satisfies ErrorResponseDoc,
  userNotFoundById: {
    status: HttpStatus.NOT_FOUND,
    description: 'No account exists for the authenticated user id.',
    code: 'User.NotFound',
    message: 'User with id 41d2f0f8-b4ce-4f11-8c6f-7fdd2b63e4b6 is not found',
  } as const satisfies ErrorResponseDoc,
  userNotFound: {
    status: HttpStatus.NOT_FOUND,
    description: 'No account exists for the authenticated user.',
    code: 'User.NotFound',
    message: 'User is not found',
  } as const satisfies ErrorResponseDoc,
  invalidCredentials: {
    status: HttpStatus.UNAUTHORIZED,
    description: 'Credentials or session token are invalid.',
    code: 'User.InvalidCredentials',
    message: 'The provided credentials are invalid',
  } as const satisfies ErrorResponseDoc,
  expiredRefreshToken: {
    status: HttpStatus.CONFLICT,
    description: 'Refresh session has expired and user must login again.',
    code: 'User.ExpiredRefreshToken',
    message: 'Refresh Token is expired, please login again',
  } as const satisfies ErrorResponseDoc,
  invalidPassword: {
    status: HttpStatus.CONFLICT,
    description: 'Password does not match policy or confirmation rules.',
    code: 'User.InvalidPassword',
    message: 'The provided password is invalid',
  } as const satisfies ErrorResponseDoc,
  invalidPasswordLength: {
    status: HttpStatus.CONFLICT,
    description: 'Password must be at least 6 characters long.',
    code: 'User.InvalidPasswordLength',
    message: 'Password must be at least 6 characters long',
  } as const satisfies ErrorResponseDoc,
  emailAlreadyInUse: {
    status: HttpStatus.CONFLICT,
    description: 'Email address is already used by another account.',
    code: 'User.EmailAlreadyInUse',
    message: 'Email doctor@example.com is already in use',
  } as const satisfies ErrorResponseDoc,
};

export function ApiValidationErrorResponse() {
  return ApiBadRequestResponse({
    description: 'Request body validation failed.',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'email must be an email',
          'password must be longer than or equal to 6 characters',
        ],
        error: 'Bad Request',
      },
    },
  });
}

export function ApiErrorResponses(...responses: readonly ErrorResponseDoc[]) {
  return applyDecorators(
    ...responses.map((response) =>
      ApiResponse({
        status: response.status,
        description: response.description,
        schema: {
          example: {
            statusCode: response.status,
            code: response.code,
            message: response.message,
          },
        },
      }),
    ),
  );
}

export function ApiUnexpectedServerErrorResponse() {
  return ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Unexpected server error.',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
      },
    },
  });
}

export function ApiAccessTokenAuth() {
  return ApiBearerAuth(SWAGGER_BEARER_AUTH_NAME);
}

export function ApiRefreshCookieAuth() {
  return ApiCookieAuth(SWAGGER_REFRESH_COOKIE_AUTH_NAME);
}
