import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserContext {
  userId: string;
  userName: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUserContext => {
    const request = context.switchToHttp().getRequest();

    return request.user as CurrentUserContext;
  },
);
