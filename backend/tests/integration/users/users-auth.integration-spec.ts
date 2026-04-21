import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { UsersIntegrationBase } from './users-integration-base';
import { UserSessionTokenType } from '../../../src/modules/users/entities/user-session.entity';

jest.setTimeout(180_000);

class UsersAuthIntegrationSuite extends UsersIntegrationBase { }

const suite = new UsersAuthIntegrationSuite();

describe('Users auth integration', () => {
    beforeAll(async () => {
        await suite.initialize();
    });

    beforeEach(async () => {
        await suite.resetDatabase();
    });

    afterAll(async () => {
        await suite.dispose();
    });

    it('register handler creates user, session and token', async () => {
        const response = suite.createResponseMock();
        const result = await suite.registerHandler.handle(
            {
                email: 'register@example.com',
                password: 'Password123!',
                userName: 'registerUser',
            },
            response,
        );

        expect(result.token).toEqual(expect.any(String));

        const savedUser = await suite.usersRepository.findOne({ where: { email: 'register@example.com' } });
        expect(savedUser).not.toBeNull();

        const savedSession = await suite.sessionsRepository.findOne({ where: { userId: savedUser!.id } });
        expect(savedSession).not.toBeNull();
        expect(savedSession!.tokenType).toBe(UserSessionTokenType.Refresh);
    });

    it('register endpoint returns created response and refresh cookie', async () => {
        const response = await suite.api()
            .post('/api/v1/auth/register')
            .send({
                email: 'endpoint-register@example.com',
                password: 'Password123!',
                userName: 'endpointRegister',
            })
            .expect(201);

        expect(response.body.token).toEqual(expect.any(String));
        expect(response.headers['set-cookie']).toEqual(expect.arrayContaining([
            expect.stringContaining('refreshToken='),
        ]));
    });

    it('login handler rejects invalid credentials and returns token for valid credentials', async () => {
        const user = await suite.seedUser({
            email: 'login@example.com',
            userName: 'loginUser',
        });

        await expect(
            suite.loginHandler.handle(
                { email: user.email, password: 'wrong-password' },
                suite.createResponseMock() as never,
            ),
        ).rejects.toBeInstanceOf(UnauthorizedException);

        const result = await suite.loginHandler.handle(
            { email: user.email, password: 'Password123!' },
            suite.createResponseMock() as never,
        );

        expect(result.token).toEqual(expect.any(String));
        const session = await suite.sessionsRepository.findOne({ where: { userId: user.id } });
        expect(session).not.toBeNull();
    });

    it('login endpoint returns token and cookie', async () => {
        await suite.seedUser({
            email: 'endpoint-login@example.com',
            userName: 'endpointLogin',
        });

        const response = await suite.api()
            .post('/api/v1/auth/login')
            .send({ email: 'endpoint-login@example.com', password: 'Password123!' })
            .expect(201);

        expect(response.body.token).toEqual(expect.any(String));
        expect(response.headers['set-cookie']).toEqual(expect.arrayContaining([
            expect.stringContaining('refreshToken='),
        ]));
    });

    it('refresh token handler rotates the stored refresh token', async () => {
        const user = await suite.seedUser({
            email: 'refresh@example.com',
            userName: 'refreshUser',
        });
        await suite.seedRefreshSession({ user, token: 'refresh-cookie-token' });

        const result = await suite.refreshTokenHandler.handle(
            { cookies: { refreshToken: 'refresh-cookie-token' } } as never,
            suite.createResponseMock() as never,
        );

        expect(result.token).toEqual(expect.any(String));
        const session = await suite.sessionsRepository.findOne({ where: { userId: user.id } });
        expect(session!.token).not.toBe('refresh-cookie-token');
    });

    it('logout handler clears the refresh session', async () => {
        const user = await suite.seedUser({
            email: 'logout@example.com',
            userName: 'logoutUser',
        });
        await suite.seedRefreshSession({ user, token: 'logout-cookie-token' });

        await suite.logoutHandler.handle(
            { cookies: { refreshToken: 'logout-cookie-token' } } as never,
            suite.createResponseMock() as never,
        );

        const session = await suite.sessionsRepository.findOne({ where: { userId: user.id } });
        expect(session).toBeNull();
    });

    it('me endpoint returns the authenticated user profile', async () => {
        const user = await suite.seedUser({
            email: 'me@example.com',
            userName: 'meUser',
        });
        const loginResult = await suite.loginHandler.handle(
            { email: user.email, password: 'Password123!' },
            suite.createResponseMock() as never,
        );

        const response = await suite.api()
            .get('/api/v1/auth/me')
            .set('Authorization', suite.buildBearerToken(loginResult.token))
            .expect(200);

        expect(response.body.email).toBe(user.email);
        expect(response.body.userName).toBe(user.userName);
    });
});
