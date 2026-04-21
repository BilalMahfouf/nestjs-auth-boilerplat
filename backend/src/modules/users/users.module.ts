import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserEntity } from './entities/user.entity';
import { UserSessionEntity } from './entities/user-session.entity';
import { JwtStrategy } from '../../common/auth/jwt.strategy';
import { UsersAuthHelpers } from './users-auth.helpers';
import {
    RegisterEndpoint,
    RegisterHandler,
} from './features/auth-register.feature';
import { LoginEndpoint, LoginHandler } from './features/auth-login.feature';
import {
    RefreshTokenEndpoint,
    RefreshTokenHandler,
} from './features/auth-refresh-token.feature';
import { LogoutEndpoint, LogoutHandler } from './features/auth-logout.feature';
import {
    ForgetPasswordEndpoint,
    ForgetPasswordHandler,
} from './features/auth-forget-password.feature';
import {
    ResetPasswordEndpoint,
    ResetPasswordHandler,
} from './features/auth-reset-password.feature';
import { MeEndpoint, MeHandler } from './features/auth-me.feature';
import {
    ChangePasswordEndpoint,
    ChangePasswordHandler,
} from './features/users-change-password.feature';
import {
    ChangeEmailEndpoint,
    ChangeEmailHandler,
} from './features/users-change-email.feature';
import {
    UpdateUserProfileEndpoint,
    UpdateUserProfileHandler,
} from './features/users-update-profile.feature';

@Module({
    imports: [
        TypeOrmModule.forFeature([UserEntity, UserSessionEntity]),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.getOrThrow<string>('JWT_SECRET_KEY'),
                signOptions: {
                    issuer: configService.getOrThrow<string>('JWT_ISSUER'),
                    audience: configService.getOrThrow<string>('JWT_AUDIENCE'),
                    expiresIn: `${configService.get<number>(
                        'JWT_ACCESS_TOKEN_LIFETIME_MINUTES',
                        50,
                    )}m`,
                },
            }),
        }),
    ],
    controllers: [
        RegisterEndpoint,
        LoginEndpoint,
        RefreshTokenEndpoint,
        LogoutEndpoint,
        ForgetPasswordEndpoint,
        ResetPasswordEndpoint,
        MeEndpoint,
        ChangePasswordEndpoint,
        ChangeEmailEndpoint,
        UpdateUserProfileEndpoint,
    ],
    providers: [
        JwtStrategy,
        UsersAuthHelpers,
        RegisterHandler,
        LoginHandler,
        RefreshTokenHandler,
        LogoutHandler,
        ForgetPasswordHandler,
        ResetPasswordHandler,
        MeHandler,
        ChangePasswordHandler,
        ChangeEmailHandler,
        UpdateUserProfileHandler,
    ],
})
export class UsersModule { }
