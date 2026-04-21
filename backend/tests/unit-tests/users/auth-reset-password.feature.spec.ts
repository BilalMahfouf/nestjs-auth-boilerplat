import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
    ResetPasswordCommandDto,
    ResetPasswordHandler,
} from '../../../src/modules/users/features/auth-reset-password.feature';

jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
}));

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('ResetPasswordHandler', () => {
    const usersRepository = {
        findOne: jest.fn(),
        save: jest.fn(),
    };

    const sessionsRepository = {
        exists: jest.fn(),
    };

    let handler: ResetPasswordHandler;

    beforeEach(() => {
        jest.clearAllMocks();

        handler = new ResetPasswordHandler(
            usersRepository as never,
            sessionsRepository as never,
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('throws not found when user does not exist by email', async () => {
        usersRepository.findOne.mockResolvedValue(null);

        const command: ResetPasswordCommandDto = {
            email: 'missing@example.com',
            token: 'token',
            password: 'password123',
            confirmPassword: 'password123',
        };

        await expect(handler.handle(command)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws unauthorized when reset token is invalid or expired', async () => {
        usersRepository.findOne.mockResolvedValue({
            id: 'user-1',
            passwordHash: 'old-hash',
        });
        sessionsRepository.exists.mockResolvedValue(false);

        const command: ResetPasswordCommandDto = {
            email: 'doctor@example.com',
            token: 'invalid-token',
            password: 'password123',
            confirmPassword: 'password123',
        };

        await expect(handler.handle(command)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws conflict when new password is too short', async () => {
        usersRepository.findOne.mockResolvedValue({
            id: 'user-1',
            passwordHash: 'old-hash',
        });
        sessionsRepository.exists.mockResolvedValue(true);

        const command: ResetPasswordCommandDto = {
            email: 'doctor@example.com',
            token: 'token',
            password: '12345',
            confirmPassword: '12345',
        };

        await expect(handler.handle(command)).rejects.toBeInstanceOf(ConflictException);
    });

    it('updates password hash when command is valid', async () => {
        const user = {
            id: 'user-1',
            passwordHash: 'old-hash',
        };

        usersRepository.findOne.mockResolvedValue(user);
        sessionsRepository.exists.mockResolvedValue(true);
        mockedBcrypt.hash.mockResolvedValue('new-hash' as never);
        usersRepository.save.mockResolvedValue(undefined);

        const command: ResetPasswordCommandDto = {
            email: 'doctor@example.com',
            token: 'token',
            password: 'password123',
            confirmPassword: 'password123',
        };

        await handler.handle(command);

        expect(user.passwordHash).toBe('new-hash');
        expect(usersRepository.save).toHaveBeenCalledWith(user);
    });

    it('rejects mismatched password confirmation', async () => {
        usersRepository.findOne.mockResolvedValue({
            id: 'user-1',
            passwordHash: 'old-hash',
        });
        sessionsRepository.exists.mockResolvedValue(true);

        const command: ResetPasswordCommandDto = {
            email: 'doctor@example.com',
            token: 'token',
            password: 'password123',
            confirmPassword: 'different-password',
        };

        await expect(handler.handle(command)).rejects.toBeInstanceOf(ConflictException);
    });
});
