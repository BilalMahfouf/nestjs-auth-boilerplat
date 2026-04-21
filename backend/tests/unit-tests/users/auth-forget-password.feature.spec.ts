import { NotFoundException } from '@nestjs/common';
import {
    ForgetPasswordCommandDto,
    ForgetPasswordHandler,
} from '../../../src/modules/users/features/auth-forget-password.feature';
import { UserSessionTokenType } from '../../../src/modules/users/entities/user-session.entity';

describe('ForgetPasswordHandler', () => {
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

    let handler: ForgetPasswordHandler;

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

        handler = new ForgetPasswordHandler(
            usersRepository as never,
            sessionsRepository as never,
            jwtService as never,
            configService as never,
        );
    });

    it('throws not found when user does not exist by email', async () => {
        usersRepository.findOne.mockResolvedValue(null);

        const command: ForgetPasswordCommandDto = {
            email: 'missing@example.com',
            clientUri: 'https://app.example.com/reset-password',
        };

        await expect(handler.handle(command)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates reset-password session token', async () => {
        const now = Date.now();
        jest.spyOn(Date, 'now').mockReturnValue(now);

        usersRepository.findOne.mockResolvedValue({
            id: 'user-1',
            userName: 'doctor1',
        });
        jwtService.sign.mockReturnValue('reset-token');
        sessionsRepository.create.mockImplementation((value) => value);
        sessionsRepository.save.mockResolvedValue(undefined);

        const command: ForgetPasswordCommandDto = {
            email: 'doctor@example.com',
            clientUri: 'https://app.example.com/reset-password',
        };

        await handler.handle(command);

        expect(sessionsRepository.create).toHaveBeenCalledWith({
            userId: 'user-1',
            token: 'reset-token',
            tokenType: UserSessionTokenType.ResetPassword,
            expiresAt: new Date(now + 15 * 60 * 1000),
        });
        expect(sessionsRepository.save).toHaveBeenCalled();
    });
});
