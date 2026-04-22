import {
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

  providerProcessFailed(): InternalServerErrorException {
    return new InternalServerErrorException({
      code: 'Payment.ProviderProcessFailed',
      message: 'Unable to process payment with provider',
    });
  },
};
