import { ConflictException, UnauthorizedException } from '@nestjs/common';
import {
    RefreshTokenHandler,
} from '../../../src/modules/users/features/auth-refresh-token.feature';

describe('RefreshTokenHandler', () => {
    const sessionsRepository = {
        findOne: jest.fn(),
        save: jest.fn(),
    };

    const jwtService = {
        sign: jest.fn(),
    };

    const configService = {
        get: jest.fn(),
        getOrThrow: jest.fn(),
    };

    const authHelpers = {
        refreshCookieName: jest.fn(),
        generateRefreshToken: jest.fn(),
        refreshCookieDays: jest.fn(),
        setRefreshTokenCookie: jest.fn(),
    };

    let handler: RefreshTokenHandler;

    beforeEach(() => {
        jest.clearAllMocks();

        configService.get.mockImplementation((key: string, defaultValue?: number) => {
            if (key === 'JWT_ACCESS_TOKEN_LIFETIME_MINUTES') {
                return 50;
            }

            return defaultValue;
        });

        configService.getOrThrow.mockImplementation((key: string) => {
            const values: Record<string, string> = {
                JWT_SECRET_KEY: 'secret',
                JWT_ISSUER: 'issuer',
                JWT_AUDIENCE: 'audience',
            };

            return values[key];
        });

        authHelpers.refreshCookieName.mockReturnValue('refreshToken');

        handler = new RefreshTokenHandler(
            sessionsRepository as never,
            jwtService as never,
            configService as never,
            authHelpers as never,
        );
    });

    it('throws unauthorized when refresh session does not exist', async () => {
        sessionsRepository.findOne.mockResolvedValue(null);

        const request = { cookies: { refreshToken: 'missing' } } as never;
        const response = {} as never;

        await expect(handler.handle(request, response)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws conflict when refresh token is expired', async () => {
        sessionsRepository.findOne.mockResolvedValue({
            token: 'refresh-token',
            expiresAt: new Date(Date.now() - 1000),
            user: { id: 'user-1', userName: 'doctor1' },
        });

        const request = { cookies: { refreshToken: 'refresh-token' } } as never;
        const response = {} as never;

        await expect(handler.handle(request, response)).rejects.toBeInstanceOf(ConflictException);
    });

    it('rotates refresh token and returns new access token', async () => {
        const now = Date.now();
        jest.spyOn(Date, 'now').mockReturnValue(now);

        const session = {
            token: 'old-refresh-token',
            expiresAt: new Date(now + 60_000),
            user: {
                id: 'user-1',
                userName: 'doctor1',
            },
        };

        sessionsRepository.findOne.mockResolvedValue(session);
        sessionsRepository.save.mockResolvedValue(undefined);
        jwtService.sign.mockReturnValue('new-access-token');
        authHelpers.generateRefreshToken.mockReturnValue('rotated-refresh-token');
        authHelpers.refreshCookieDays.mockReturnValue(7);

        const request = { cookies: { refreshToken: 'old-refresh-token' } } as never;
        const response = {} as never;

        const result = await handler.handle(request, response);

        expect(result).toEqual({ token: 'new-access-token' });
        expect(session.token).toBe('rotated-refresh-token');
        expect(sessionsRepository.save).toHaveBeenCalledWith(session);
        expect(authHelpers.setRefreshTokenCookie).toHaveBeenCalledWith(
            response,
            'rotated-refresh-token',
            new Date(now + 7 * 24 * 60 * 60 * 1000),
        );
    });
});
