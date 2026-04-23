import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

export const PaymentsErrors = {
  userNotFoundById(userId: string): NotFoundException {
    return new NotFoundException({
      code: 'Payment.UserNotFound',
      message: `User with id ${userId} is not found`,
    });
  },

  idempotencyKeyRequired(): BadRequestException {
    return new BadRequestException({
      code: 'Payment.IdempotencyKeyRequired',
      message: 'idempotency-key header is required',
    });
  },

  providerProcessFailed(): InternalServerErrorException {
    return new InternalServerErrorException({
      code: 'Payment.ProviderProcessFailed',
      message: 'Unable to process payment with provider',
    });
  },
};
