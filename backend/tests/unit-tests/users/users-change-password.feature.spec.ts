import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
    ChangePasswordCommandDto,
    ChangePasswordHandler,
} from '../../../src/modules/users/features/users-change-password.feature';

jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
}));

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('ChangePasswordHandler', () => {
    const usersRepository = {
        findOne: jest.fn(),
        save: jest.fn(),
    };

    let handler: ChangePasswordHandler;

    beforeEach(() => {
        jest.clearAllMocks();
        handler = new ChangePasswordHandler(usersRepository as never);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('throws not found when current user does not exist', async () => {
        usersRepository.findOne.mockResolvedValue(null);

        const command: ChangePasswordCommandDto = {
            currentPassword: 'oldPassword123',
            newPassword: 'newPassword123',
            confirmNewPassword: 'newPassword123',
        };

        await expect(handler.handle('missing-user', command)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws conflict when current password is invalid', async () => {
        usersRepository.findOne.mockResolvedValue({
            id: 'user-1',
            passwordHash: 'hashed-old',
        });
        mockedBcrypt.compare.mockResolvedValue(false as never);

        const command: ChangePasswordCommandDto = {
            currentPassword: 'wrong-password',
            newPassword: 'newPassword123',
            confirmNewPassword: 'newPassword123',
        };

        await expect(handler.handle('user-1', command)).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws conflict when new password is too short', async () => {
        usersRepository.findOne.mockResolvedValue({
            id: 'user-1',
            passwordHash: 'hashed-old',
        });
        mockedBcrypt.compare.mockResolvedValue(true as never);

        const command: ChangePasswordCommandDto = {
            currentPassword: 'oldPassword123',
            newPassword: '12345',
            confirmNewPassword: '12345',
        };

        await expect(handler.handle('user-1', command)).rejects.toBeInstanceOf(ConflictException);
    });

    it('updates password hash when command is valid', async () => {
        const user = {
            id: 'user-1',
            passwordHash: 'hashed-old',
        };

        usersRepository.findOne.mockResolvedValue(user);
        mockedBcrypt.compare.mockResolvedValue(true as never);
        mockedBcrypt.hash.mockResolvedValue('hashed-new' as never);
        usersRepository.save.mockResolvedValue(undefined);

        const command: ChangePasswordCommandDto = {
            currentPassword: 'oldPassword123',
            newPassword: 'newPassword123',
            confirmNewPassword: 'newPassword123',
        };

        await handler.handle('user-1', command);

        expect(user.passwordHash).toBe('hashed-new');
        expect(usersRepository.save).toHaveBeenCalledWith(user);
    });

    it('rejects mismatched password confirmation', async () => {
        usersRepository.findOne.mockResolvedValue({
            id: 'user-1',
            passwordHash: 'hashed-old',
        });
        mockedBcrypt.compare.mockResolvedValue(true as never);

        const command: ChangePasswordCommandDto = {
            currentPassword: 'oldPassword123',
            newPassword: 'newPassword123',
            confirmNewPassword: 'differentPassword123',
        };

        await expect(handler.handle('user-1', command)).rejects.toBeInstanceOf(ConflictException);
    });
});
