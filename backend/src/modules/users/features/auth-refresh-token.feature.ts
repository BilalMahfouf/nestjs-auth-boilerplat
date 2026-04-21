import { Controller, Injectable, Post, Res } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request, Response } from 'express';
import { Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { UserSessionEntity } from '../entities/user-session.entity';
import { UserEntity } from '../entities/user.entity';
import { UsersAuthHelpers } from '../users-auth.helpers';
import { UsersErrors } from '../users.errors';
import {
    ApiCreatedResponse,
    ApiOperation,
    ApiProperty,
    ApiTags,
} from '@nestjs/swagger';
import {
    ApiErrorResponses,
    ApiRefreshCookieAuth,
    ApiUnexpectedServerErrorResponse,
    UsersErrorDocs,
} from '../../../common/swagger/swagger.responses';

export class RefreshTokenCommandDto { }

export class RefreshTokenResponseDto {
    @ApiProperty({
        example: '<jwt-access-token>',
        description: 'New JWT access token for Authorization header.',
    })
    token!: string;
}

@Injectable()
export class RefreshTokenHandler {
    constructor(
        @InjectRepository(UserSessionEntity)
        private readonly sessionsRepository: Repository<UserSessionEntity>,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly authHelpers: UsersAuthHelpers,
    ) { }

    private generateAccessToken(user: UserEntity): string {
        const payload = {
            sub: user.id,
            nameIdentifier: user.id,
            name: user.userName,
            jti: randomUUID(),
            iat: Math.floor(Date.now() / 1000),
        };

        const expiresInMinutes = this.configService.get<number>(
            'JWT_ACCESS_TOKEN_LIFETIME_MINUTES',
            50,
        );

        return this.jwtService.sign(payload, {
            secret: this.configService.getOrThrow<string>('JWT_SECRET_KEY'),
            issuer: this.configService.getOrThrow<string>('JWT_ISSUER'),
            audience: this.configService.getOrThrow<string>('JWT_AUDIENCE'),
            expiresIn: expiresInMinutes * 60,
        });
    }

    async handle(request: Request, response: Response): Promise<RefreshTokenResponseDto> {
        const refreshToken =
            (request.cookies?.[this.authHelpers.refreshCookieName()] as string | undefined) ?? '';

        const session = await this.sessionsRepository.findOne({
            where: { token: refreshToken },
            relations: { user: true },
        });

        if (!session) {
            throw UsersErrors.invalidCredentials();
        }

        if (session.expiresAt && session.expiresAt.getTime() < Date.now()) {
            throw UsersErrors.expiredRefreshToken();
        }

        const token = this.generateAccessToken(session.user);
        const rotatedRefreshToken = this.authHelpers.generateRefreshToken();
        session.token = rotatedRefreshToken;

        await this.sessionsRepository.save(session);

        const refreshExpiresAt = new Date(
            Date.now() + this.authHelpers.refreshCookieDays() * 24 * 60 * 60 * 1000,
        );

        this.authHelpers.setRefreshTokenCookie(response, rotatedRefreshToken, refreshExpiresAt);

        return { token };
    }
}

@Controller('auth')
@ApiTags('Auth')
export class RefreshTokenEndpoint {
    constructor(private readonly handler: RefreshTokenHandler) { }

    @Post('refresh-token')
    @ApiOperation({
        summary: 'Refresh access token',
        description:
            'Reads refresh token from cookie, rotates it, and returns a new JWT access token.',
    })
    @ApiRefreshCookieAuth()
    @ApiCreatedResponse({
        description: 'Access token refreshed successfully.',
        type: RefreshTokenResponseDto,
        headers: {
            'Set-Cookie': {
                description: 'Rotated HttpOnly refresh token cookie.',
                schema: { type: 'string' },
            },
        },
    })
    @ApiErrorResponses(
        UsersErrorDocs.invalidCredentials,
        UsersErrorDocs.expiredRefreshToken,
    )
    @ApiUnexpectedServerErrorResponse()
    async execute(
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response,
    ): Promise<RefreshTokenResponseDto> {
        return this.handler.handle(request, response);
    }
}
