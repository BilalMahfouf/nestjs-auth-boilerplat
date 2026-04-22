import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

export const UsersErrors = {
  userNotFoundByEmail(email: string): NotFoundException {
    return new NotFoundException({
      code: 'User.NotFound',
      message: `User with email ${email} is not found`,
    });
  },

  userNotFoundById(id: string): NotFoundException {
    return new NotFoundException({
      code: 'User.NotFound',
      message: `User with id ${id} is not found`,
    });
  },

  userNotFound(): NotFoundException {
    return new NotFoundException({
      code: 'User.NotFound',
      message: 'User is not found',
    });
  },

  invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'User.InvalidCredentials',
      message: 'The provided credentials are invalid',
    });
  },

  expiredRefreshToken(): ConflictException {
    return new ConflictException({
      code: 'User.ExpiredRefreshToken',
      message: 'Refresh Token is expired, please login again',
    });
  },

  invalidPassword(): ConflictException {
    return new ConflictException({
      code: 'User.InvalidPassword',
      message: 'The provided password is invalid',
    });
  },

  invalidPasswordLength(): ConflictException {
    return new ConflictException({
      code: 'User.InvalidPasswordLength',
      message: 'Password must be at least 6 characters long',
    });
  },

  emailAlreadyInUse(email: string): ConflictException {
    return new ConflictException({
      code: 'User.EmailAlreadyInUse',
      message: `Email ${email} is already in use`,
    });
  },
};
