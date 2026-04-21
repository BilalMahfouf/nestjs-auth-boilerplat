import { Controller, HttpCode, Injectable, Post, Req, Res } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request, Response } from 'express';
import { UserSessionEntity } from '../entities/user-session.entity';
import { UsersAuthHelpers } from '../users-auth.helpers';
import { UsersErrors } from '../users.errors';
import {
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';
import {
    ApiErrorResponses,
    ApiRefreshCookieAuth,
    ApiUnexpectedServerErrorResponse,
    UsersErrorDocs,
} from '../../../common/swagger/swagger.responses';

export class LogoutCommandDto { }

@Injectable()
export class LogoutHandler {
    constructor(
        @InjectRepository(UserSessionEntity)
        private readonly sessionsRepository: Repository<UserSessionEntity>,
        private readonly authHelpers: UsersAuthHelpers,
    ) { }

    async handle(request: Request, response: Response): Promise<void> {
        const refreshToken =
            (request.cookies?.[this.authHelpers.refreshCookieName()] as string | undefined) ?? '';

        const session = await this.sessionsRepository.findOne({
            where: { token: refreshToken },
        });

        if (!session) {
            throw UsersErrors.invalidCredentials();
        }

        await this.sessionsRepository.remove(session);

        this.authHelpers.clearRefreshTokenCookie(response);
    }
}

@Controller('auth')
@ApiTags('Auth')
export class LogoutEndpoint {
    constructor(private readonly handler: LogoutHandler) { }

    @Post('logout')
    @HttpCode(200)
    @ApiOperation({
        summary: 'Logout',
        description: 'Invalidates refresh session and clears refresh token cookie.',
    })
    @ApiRefreshCookieAuth()
    @ApiOkResponse({
        description: 'Logout successful. Response body is empty.',
        headers: {
            'Set-Cookie': {
                description: 'Clears the refresh token cookie.',
                schema: { type: 'string' },
            },
        },
    })
    @ApiErrorResponses(UsersErrorDocs.invalidCredentials)
    @ApiUnexpectedServerErrorResponse()
    async execute(
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response,
    ): Promise<void> {
        await this.handler.handle(request, response);
    }
}
