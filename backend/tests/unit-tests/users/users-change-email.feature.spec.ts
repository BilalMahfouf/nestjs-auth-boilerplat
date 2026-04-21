import { ConflictException, NotFoundException } from '@nestjs/common';
import {
    ChangeEmailCommandDto,
    ChangeEmailHandler,
} from '../../../src/modules/users/features/users-change-email.feature';

describe('ChangeEmailHandler', () => {
    const usersRepository = {
        exists: jest.fn(),
        findOne: jest.fn(),
        save: jest.fn(),
    };

    let handler: ChangeEmailHandler;

    beforeEach(() => {
        jest.clearAllMocks();
        handler = new ChangeEmailHandler(usersRepository as never);
    });

    it('throws conflict when email is already in use', async () => {
        usersRepository.exists.mockResolvedValue(true);

        const command: ChangeEmailCommandDto = {
            email: 'taken@example.com',
        };

        await expect(handler.handle('user-1', command)).rejects.toBeInstanceOf(ConflictException);
        expect(usersRepository.findOne).not.toHaveBeenCalled();
    });

    it('throws not found when current user does not exist', async () => {
        usersRepository.exists.mockResolvedValue(false);
        usersRepository.findOne.mockResolvedValue(null);

        const command: ChangeEmailCommandDto = {
            email: 'new@example.com',
        };

        await expect(handler.handle('missing-user', command)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates email when command is valid', async () => {
        const user = {
            email: 'old@example.com',
            updateEmail: jest.fn(function (this: { email: string }, email: string) {
                this.email = email;
            }),
        };

        usersRepository.exists.mockResolvedValue(false);
        usersRepository.findOne.mockResolvedValue(user);
        usersRepository.save.mockResolvedValue(undefined);

        const command: ChangeEmailCommandDto = {
            email: 'new@example.com',
        };

        await handler.handle('user-1', command);

        expect(user.updateEmail).toHaveBeenCalledWith('new@example.com');
        expect(usersRepository.save).toHaveBeenCalledWith(user);
    });
});
