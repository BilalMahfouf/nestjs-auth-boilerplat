import { NotFoundException } from '@nestjs/common';
import { MeHandler } from '../../../src/modules/users/features/auth-me.feature';

describe('MeHandler', () => {
    const usersRepository = {
        findOne: jest.fn(),
    };

    let handler: MeHandler;

    beforeEach(() => {
        jest.clearAllMocks();
        handler = new MeHandler(usersRepository as never);
    });

    it('throws not found when user does not exist', async () => {
        usersRepository.findOne.mockResolvedValue(null);

        await expect(handler.handle('missing-user')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns mapped current user profile', async () => {
        const createdOnUtc = new Date('2026-01-01T10:00:00.000Z');
        usersRepository.findOne.mockResolvedValue({
            id: 'user-1',
            userName: 'doctor1',
            firstName: 'John',
            lastName: 'Doe',
            fullName: 'John Doe',
            email: 'doctor@example.com',
            role: 'Doctor',
            isActive: true,
            createdOnUtc,
        });

        const result = await handler.handle('user-1');

        expect(result).toEqual({
            id: 'user-1',
            userName: 'doctor1',
            fullName: 'John Doe',
            email: 'doctor@example.com',
            role: 'Doctor',
            isActive: true,
            clinicInfromationCompleted: false,
            subscriptionStatus: null,
            isSubscriptionExist: null,
            createdOnUtc,
        });
    });
});
