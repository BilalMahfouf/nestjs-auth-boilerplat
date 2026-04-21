import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { UserEntity } from '../../../src/modules/users/entities/user.entity';
import {
    UserSessionEntity,
    UserSessionTokenType,
} from '../../../src/modules/users/entities/user-session.entity';
import { ChangeEmailHandler } from '../../../src/modules/users/features/users-change-email.feature';
import { ChangePasswordHandler } from '../../../src/modules/users/features/users-change-password.feature';
import { ForgetPasswordHandler } from '../../../src/modules/users/features/auth-forget-password.feature';
import { LoginHandler } from '../../../src/modules/users/features/auth-login.feature';
import { LogoutHandler } from '../../../src/modules/users/features/auth-logout.feature';
import { MeHandler } from '../../../src/modules/users/features/auth-me.feature';
import { RefreshTokenHandler } from '../../../src/modules/users/features/auth-refresh-token.feature';
import { RegisterHandler } from '../../../src/modules/users/features/auth-register.feature';
import { ResetPasswordHandler } from '../../../src/modules/users/features/auth-reset-password.feature';
import { UpdateUserProfileHandler } from '../../../src/modules/users/features/users-update-profile.feature';
import { IntegrationTestBase } from '../core/integration-test-base';

export abstract class UsersIntegrationBase extends IntegrationTestBase {
    protected get httpServer() {
        return this.app.getHttpServer();
    }

    protected get usersRepository(): Repository<UserEntity> {
        return this.dataSource.getRepository(UserEntity);
    }

    protected get sessionsRepository(): Repository<UserSessionEntity> {
        return this.dataSource.getRepository(UserSessionEntity);
    }

    protected get registerHandler(): RegisterHandler {
        return this.app.get(RegisterHandler);
    }

    protected get loginHandler(): LoginHandler {
        return this.app.get(LoginHandler);
    }

    protected get refreshTokenHandler(): RefreshTokenHandler {
        return this.app.get(RefreshTokenHandler);
    }

    protected get logoutHandler(): LogoutHandler {
        return this.app.get(LogoutHandler);
    }

    protected get meHandler(): MeHandler {
        return this.app.get(MeHandler);
    }

    protected get forgetPasswordHandler(): ForgetPasswordHandler {
        return this.app.get(ForgetPasswordHandler);
    }

    protected get resetPasswordHandler(): ResetPasswordHandler {
        return this.app.get(ResetPasswordHandler);
    }

    protected get changePasswordHandler(): ChangePasswordHandler {
        return this.app.get(ChangePasswordHandler);
    }

    protected get changeEmailHandler(): ChangeEmailHandler {
        return this.app.get(ChangeEmailHandler);
    }

    protected get updateUserProfileHandler(): UpdateUserProfileHandler {
        return this.app.get(UpdateUserProfileHandler);
    }

    protected api(): ReturnType<typeof request> {
        return request(this.app.getHttpServer());
    }

    protected createResponseMock(): { cookie: jest.Mock; clearCookie: jest.Mock } {
        return {
            cookie: jest.fn(),
            clearCookie: jest.fn(),
        };
    }

    protected async resetDatabase(): Promise<void> {
        await this.dataSource.query('TRUNCATE TABLE user_sessions, users RESTART IDENTITY CASCADE');
    }

    protected async seedUser(overrides: Partial<UserEntity> = {}): Promise<UserEntity> {
        const user = this.usersRepository.create({
            userName: 'doctor1',
            email: 'doctor@example.com',
            passwordHash: await bcrypt.hash('Password123!', 10),
            role: overrides.role,
            isActive: overrides.isActive ?? true,
            ...overrides,
        });

        return this.usersRepository.save(user);
    }

    protected async seedRefreshSession(params: {
        user: UserEntity;
        token?: string;
        expiresAt?: Date | null;
        tokenType?: UserSessionTokenType;
    }): Promise<UserSessionEntity> {
        const session = this.sessionsRepository.create({
            userId: params.user.id,
            token: params.token ?? 'refresh-token',
            tokenType: params.tokenType ?? UserSessionTokenType.Refresh,
            expiresAt: params.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            user: params.user,
        });

        return this.sessionsRepository.save(session);
    }

    protected buildAuthCookie(name: string, value: string): string {
        return `${name}=${value}`;
    }

    protected buildBearerToken(token: string): string {
        return `Bearer ${token}`;
    }
}
