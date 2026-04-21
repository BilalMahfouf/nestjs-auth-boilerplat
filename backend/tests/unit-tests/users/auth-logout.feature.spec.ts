import { UnauthorizedException } from '@nestjs/common';
import { LogoutHandler } from '../../../src/modules/users/features/auth-logout.feature';

describe('LogoutHandler', () => {
    const sessionsRepository = {
        findOne: jest.fn(),
        remove: jest.fn(),
    };

    const authHelpers = {
        refreshCookieName: jest.fn(),
        clearRefreshTokenCookie: jest.fn(),
    };

    let handler: LogoutHandler;

    beforeEach(() => {
        jest.clearAllMocks();
        authHelpers.refreshCookieName.mockReturnValue('refreshToken');

        handler = new LogoutHandler(
            sessionsRepository as never,
            authHelpers as never,
        );
    });

    it('throws unauthorized when refresh token session does not exist', async () => {
        sessionsRepository.findOne.mockResolvedValue(null);

        const request = { cookies: { refreshToken: 'missing-token' } } as never;
        const response = {} as never;

        await expect(handler.handle(request, response)).rejects.toBeInstanceOf(UnauthorizedException);
        expect(sessionsRepository.remove).not.toHaveBeenCalled();
    });

    it('removes refresh session and clears cookie', async () => {
        const session = { id: 'session-1' };
        sessionsRepository.findOne.mockResolvedValue(session);
        sessionsRepository.remove.mockResolvedValue(undefined);

        const request = { cookies: { refreshToken: 'refresh-token' } } as never;
        const response = {} as never;

        await handler.handle(request, response);

        expect(sessionsRepository.remove).toHaveBeenCalledWith(session);
        expect(authHelpers.clearRefreshTokenCookie).toHaveBeenCalledWith(response);
    });
});
