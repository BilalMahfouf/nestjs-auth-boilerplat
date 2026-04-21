import { NotFoundException } from '@nestjs/common';
import {
    UpdateUserProfileCommandDto,
    UpdateUserProfileHandler,
} from '../../../src/modules/users/features/users-update-profile.feature';

describe('UpdateUserProfileHandler', () => {
    const usersRepository = {
        findOne: jest.fn(),
        save: jest.fn(),
    };

    let handler: UpdateUserProfileHandler;

    beforeEach(() => {
        jest.clearAllMocks();
        handler = new UpdateUserProfileHandler(usersRepository as never);
    });

    it('throws not found when current user does not exist', async () => {
        usersRepository.findOne.mockResolvedValue(null);

        const command: UpdateUserProfileCommandDto = {
            userName: 'doctor1',
        };

        await expect(handler.handle('missing-user', command)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates profile when user exists', async () => {
        const user = {
            userName: 'oldUser',
            updateProfile: jest.fn(function (
                this: { userName: string },
                userName: string,
            ) {
                this.userName = userName;
            }),
        };

        usersRepository.findOne.mockResolvedValue(user);
        usersRepository.save.mockResolvedValue(undefined);

        const command: UpdateUserProfileCommandDto = {
            userName: 'doctor2',
        };

        await handler.handle('user-1', command);

        expect(user.updateProfile).toHaveBeenCalledWith('doctor2');
        expect(usersRepository.save).toHaveBeenCalledWith(user);
    });
});
