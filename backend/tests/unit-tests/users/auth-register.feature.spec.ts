import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
    RegisterCommandDto,
    RegisterHandler,
} from '../../../src/modules/users/features/auth-register.feature';
import { UserRole } from '../../../src/modules/users/entities/user.entity';
import { UserSessionTokenType } from '../../../src/modules/users/entities/user-session.entity';

jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
}));

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('RegisterHandler', () => {
    const usersRepository = {
        exists: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
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

    let handler: RegisterHandler;

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

        handler = new RegisterHandler(
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

    it('throws conflict when email is already in use', async () => {
        usersRepository.exists.mockResolvedValue(true);

        const command: RegisterCommandDto = {
            email: 'doctor@example.com',
            password: 'password123',
            userName: 'doctor1',
            firstName: 'John',
            lastName: 'Doe',
        };

        await expect(handler.handle(command, response)).rejects.toBeInstanceOf(ConflictException);
        expect(usersRepository.create).not.toHaveBeenCalled();
    });

    it('creates user, session and returns access token', async () => {
        const now = Date.now();
        jest.spyOn(Date, 'now').mockReturnValue(now);
        mockedBcrypt.hash.mockResolvedValue('hashed-password' as never);

        usersRepository.exists.mockResolvedValue(false);
        usersRepository.create.mockImplementation((value) => value);
        usersRepository.save.mockResolvedValue({
            id: 'user-1',
            userName: 'doctor1',
            firstName: 'John',
            lastName: 'Doe',
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

        const command: RegisterCommandDto = {
            email: 'doctor@example.com',
            password: 'password123',
            userName: 'doctor1',
            firstName: 'John',
            lastName: 'Doe',
        };

        const result = await handler.handle(command, response);

        expect(result).toEqual({ token: 'access-token' });
        expect(usersRepository.create).toHaveBeenCalledWith({
            userName: 'doctor1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'doctor@example.com',
            passwordHash: 'hashed-password',
            role: UserRole.Doctor,
            isActive: true,
        });
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
        expect(jwtService.sign).toHaveBeenCalledWith(
            expect.objectContaining({
                sub: 'user-1',
                nameIdentifier: 'user-1',
                name: 'doctor1',
            }),
            expect.objectContaining({
                secret: 'secret',
                issuer: 'issuer',
                audience: 'audience',
                expiresIn: 3000,
            }),
        );
    });
});
