import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
    LoginCommandDto,
    LoginHandler,
} from '../../../src/modules/users/features/auth-login.feature';
import { UserRole } from '../../../src/modules/users/entities/user.entity';
import { UserSessionTokenType } from '../../../src/modules/users/entities/user-session.entity';

jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
}));

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('LoginHandler', () => {
    const usersRepository = {
        findOne: jest.fn(),
    };

    const sessionsRepository = {
        create: jest.fn(),
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
        generateRefreshToken: jest.fn(),
        refreshCookieDays: jest.fn(),
        setRefreshTokenCookie: jest.fn(),
    };

    const response = {} as never;

    let handler: LoginHandler;

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

        handler = new LoginHandler(
            usersRepository as never,
            sessionsRepository as never,
            jwtService as never,
            configService as never,
            authHelpers as never,
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('throws not found when user does not exist', async () => {
        usersRepository.findOne.mockResolvedValue(null);

        const command: LoginCommandDto = {
            email: 'doctor@example.com',
            password: 'password123',
        };

        await expect(handler.handle(command, response)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws unauthorized when password is invalid', async () => {
        usersRepository.findOne.mockResolvedValue({
            id: 'user-1',
            passwordHash: 'hashed-password',
        });
        mockedBcrypt.compare.mockResolvedValue(false as never);

        const command: LoginCommandDto = {
            email: 'doctor@example.com',
            password: 'wrong-password',
        };

        await expect(handler.handle(command, response)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('creates refresh session and returns access token', async () => {
        const now = Date.now();
        jest.spyOn(Date, 'now').mockReturnValue(now);
        mockedBcrypt.compare.mockResolvedValue(true as never);

        usersRepository.findOne.mockResolvedValue({
            id: 'user-1',
            userName: 'doctor1',
            email: 'doctor@example.com',
            passwordHash: 'hashed-password',
            role: UserRole.Doctor,
            isActive: true,
        });

        jwtService.sign.mockReturnValue('access-token');
        authHelpers.generateRefreshToken.mockReturnValue('refresh-token');
        authHelpers.refreshCookieDays.mockReturnValue(7);

        sessionsRepository.create.mockImplementation((value) => value);
        sessionsRepository.save.mockResolvedValue(undefined);

        const command: LoginCommandDto = {
            email: 'doctor@example.com',
            password: 'password123',
        };

        const result = await handler.handle(command, response);

        expect(result).toEqual({ token: 'access-token' });
        expect(sessionsRepository.create).toHaveBeenCalledWith({
            userId: 'user-1',
            token: 'refresh-token',
            tokenType: UserSessionTokenType.Refresh,
            expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
        });
        expect(authHelpers.setRefreshTokenCookie).toHaveBeenCalledWith(
            response,
            'refresh-token',
            new Date(now + 7 * 24 * 60 * 60 * 1000),
        );
    });
});
