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
            firstName: 'John',
            lastName: 'Doe',
        };

        await expect(handler.handle('missing-user', command)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates profile when user exists', async () => {
        const user = {
            userName: 'oldUser',
            firstName: 'Old',
            lastName: 'Name',
            updateProfile: jest.fn(function (
                this: { userName: string; firstName: string; lastName: string },
                userName: string,
                firstName: string,
                lastName: string,
            ) {
                this.userName = userName;
                this.firstName = firstName;
                this.lastName = lastName;
            }),
        };

        usersRepository.findOne.mockResolvedValue(user);
        usersRepository.save.mockResolvedValue(undefined);

        const command: UpdateUserProfileCommandDto = {
            userName: 'doctor2',
            firstName: 'Jane',
            lastName: 'Smith',
        };

        await handler.handle('user-1', command);

        expect(user.updateProfile).toHaveBeenCalledWith('doctor2', 'Jane', 'Smith');
        expect(usersRepository.save).toHaveBeenCalledWith(user);
    });
});
