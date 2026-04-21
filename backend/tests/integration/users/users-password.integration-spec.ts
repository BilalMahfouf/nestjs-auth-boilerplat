import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersIntegrationBase } from './users-integration-base';
import { UserSessionTokenType } from '../../../src/modules/users/entities/user-session.entity';

jest.setTimeout(180_000);

class UsersPasswordIntegrationSuite extends UsersIntegrationBase { }

const suite = new UsersPasswordIntegrationSuite();

describe('Users password integration', () => {
    beforeAll(async () => {
        await suite.initialize();
    });

    beforeEach(async () => {
        await suite.resetDatabase();
    });

    afterAll(async () => {
        await suite.dispose();
    });

    it('forget password handler creates reset session', async () => {
        const user = await suite.seedUser({
            email: 'forget@example.com',
            userName: 'forgetUser',
        });

        await suite.forgetPasswordHandler.handle({
            email: user.email,
            clientUri: 'https://app.local/reset',
        });

        const session = await suite.sessionsRepository.findOne({ where: { userId: user.id } });
        expect(session).not.toBeNull();
        expect(session!.tokenType).toBe(UserSessionTokenType.ResetPassword);
    });

    it('forget password handler rejects unknown email', async () => {
        await expect(
            suite.forgetPasswordHandler.handle({
                email: 'missing@example.com',
                clientUri: 'https://app.local/reset',
            }),
        ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('reset password handler rejects missing user, invalid token, short password and accepts valid reset', async () => {
        await expect(
            suite.resetPasswordHandler.handle({
                email: 'missing@example.com',
                token: 'token',
                password: 'Password123!',
                confirmPassword: 'Password123!',
            }),
        ).rejects.toBeInstanceOf(NotFoundException);

        const user = await suite.seedUser({
            email: 'reset@example.com',
            userName: 'resetUser',
        });

        await expect(
            suite.resetPasswordHandler.handle({
                email: user.email,
                token: 'bad-token',
                password: 'Password123!',
                confirmPassword: 'Password123!',
            }),
        ).rejects.toBeInstanceOf(UnauthorizedException);

        await suite.seedRefreshSession({
            user,
            token: 'reset-token',
            tokenType: UserSessionTokenType.ResetPassword,
        });

        await expect(
            suite.resetPasswordHandler.handle({
                email: user.email,
                token: 'reset-token',
                password: '12345',
                confirmPassword: '12345',
            }),
        ).rejects.toBeInstanceOf(ConflictException);

        const resetResult = await suite.resetPasswordHandler.handle({
            email: user.email,
            token: 'reset-token',
            password: 'Password456!',
            confirmPassword: 'Password456!',
        });
        expect(resetResult).toBeUndefined();

        const updatedUser = await suite.usersRepository.findOne({ where: { id: user.id } });
        expect(updatedUser!.passwordHash).not.toBe(user.passwordHash);
        expect(await bcrypt.compare('Password456!', updatedUser!.passwordHash)).toBe(true);
    });

    it('reset password endpoint works over HTTP', async () => {
        const user = await suite.seedUser({
            email: 'reset-endpoint@example.com',
            userName: 'resetEndpointUser',
        });
        await suite.seedRefreshSession({
            user,
            token: 'endpoint-reset-token',
            tokenType: UserSessionTokenType.ResetPassword,
        });

        await suite.api()
            .put('/api/v1/auth/reset-password')
            .send({
                email: user.email,
                token: 'endpoint-reset-token',
                password: 'Password789!',
                confirmPassword: 'Password789!',
            })
            .expect(200);
    });

    it('change password handler rejects bad current password and mismatched confirmation', async () => {
        const user = await suite.seedUser({
            email: 'change-password@example.com',
            userName: 'changePasswordUser',
        });

        await expect(
            suite.changePasswordHandler.handle(user.id, {
                currentPassword: 'wrong-password',
                newPassword: 'Password456!',
                confirmNewPassword: 'Password456!',
            }),
        ).rejects.toBeInstanceOf(ConflictException);

        await expect(
            suite.changePasswordHandler.handle(user.id, {
                currentPassword: 'Password123!',
                newPassword: 'Password456!',
                confirmNewPassword: 'different-password',
            }),
        ).rejects.toBeInstanceOf(ConflictException);

        await suite.changePasswordHandler.handle(user.id, {
            currentPassword: 'Password123!',
            newPassword: 'Password456!',
            confirmNewPassword: 'Password456!',
        });

        const updatedUser = await suite.usersRepository.findOne({ where: { id: user.id } });
        expect(await bcrypt.compare('Password456!', updatedUser!.passwordHash)).toBe(true);
    });

    it('change password endpoint works over HTTP', async () => {
        const user = await suite.seedUser({
            email: 'change-password-endpoint@example.com',
            userName: 'changePasswordEndpointUser',
        });
        const loginResult = await suite.loginHandler.handle(
            { email: user.email, password: 'Password123!' },
            suite.createResponseMock() as never,
        );

        await suite.api()
            .post('/api/v1/users/change-password')
            .set('Authorization', suite.buildBearerToken(loginResult.token))
            .send({
                currentPassword: 'Password123!',
                newPassword: 'Password456!',
                confirmNewPassword: 'Password456!',
            })
            .expect(200);
    });
});
