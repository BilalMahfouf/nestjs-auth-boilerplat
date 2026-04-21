import { ConflictException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UsersIntegrationBase } from './users-integration-base';

jest.setTimeout(180_000);

class UsersProfileIntegrationSuite extends UsersIntegrationBase { }

const suite = new UsersProfileIntegrationSuite();

describe('Users profile integration', () => {
    beforeAll(async () => {
        await suite.initialize();
    });

    beforeEach(async () => {
        await suite.resetDatabase();
    });

    afterAll(async () => {
        await suite.dispose();
    });

    it('change email handler rejects duplicates and updates the current user', async () => {
        const existingUser = await suite.seedUser({
            email: 'existing@example.com',
            userName: 'existingUser',
        });
        const targetUser = await suite.seedUser({
            email: 'target@example.com',
            userName: 'targetUser',
        });

        await expect(
            suite.changeEmailHandler.handle(targetUser.id, {
                email: existingUser.email,
            }),
        ).rejects.toBeInstanceOf(ConflictException);

        await suite.changeEmailHandler.handle(targetUser.id, {
            email: 'new-target@example.com',
        });

        const updatedUser = await suite.usersRepository.findOne({ where: { id: targetUser.id } });
        expect(updatedUser!.email).toBe('new-target@example.com');
    });

    it('change email endpoint requires auth and updates the email', async () => {
        const user = await suite.seedUser({
            email: 'change-email-endpoint@example.com',
            userName: 'changeEmailEndpointUser',
        });
        const loginResult = await suite.loginHandler.handle(
            { email: user.email, password: 'Password123!' },
            suite.createResponseMock() as never,
        );

        await suite.api()
            .patch('/api/v1/users/change-email')
            .set('Authorization', suite.buildBearerToken(loginResult.token))
            .send({ email: 'changed@example.com' })
            .expect(204);

        const updatedUser = await suite.usersRepository.findOne({ where: { id: user.id } });
        expect(updatedUser!.email).toBe('changed@example.com');
    });

    it('update profile handler rejects missing users and updates fields', async () => {
        await expect(
            suite.updateUserProfileHandler.handle(randomUUID(), {
                userName: 'newName',
            }),
        ).rejects.toBeInstanceOf(NotFoundException);

        const user = await suite.seedUser({
            email: 'profile@example.com',
            userName: 'profileUser',
        });

        await suite.updateUserProfileHandler.handle(user.id, {
            userName: 'updatedUser',
        });

        const updatedUser = await suite.usersRepository.findOne({ where: { id: user.id } });
        expect(updatedUser!.userName).toBe('updatedUser');
    });

    it('update profile endpoint works over HTTP', async () => {
        const user = await suite.seedUser({
            email: 'profile-endpoint@example.com',
            userName: 'profileEndpointUser',
        });
        const loginResult = await suite.loginHandler.handle(
            { email: user.email, password: 'Password123!' },
            suite.createResponseMock() as never,
        );

        await suite.api()
            .put('/api/v1/users/update-profile')
            .set('Authorization', suite.buildBearerToken(loginResult.token))
            .send({
                userName: 'profileEndpointUpdated',
            })
            .expect(204);

        const updatedUser = await suite.usersRepository.findOne({ where: { id: user.id } });
        expect(updatedUser!.userName).toBe('profileEndpointUpdated');
    });
});
