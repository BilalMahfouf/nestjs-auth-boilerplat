import { Body, Controller, HttpCode, Injectable, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { UserEntity } from '../entities/user.entity';
import { UserSessionEntity, UserSessionTokenType } from '../entities/user-session.entity';
import { UsersErrors } from '../users.errors';
import {
    ApiBody,
    ApiNoContentResponse,
    ApiOperation,
    ApiProperty,
    ApiTags,
} from '@nestjs/swagger';
import {
    ApiErrorResponses,
    ApiUnexpectedServerErrorResponse,
    ApiValidationErrorResponse,
    UsersErrorDocs,
} from '../../../common/swagger/swagger.responses';

export class ForgetPasswordCommandDto {
    @ApiProperty({ example: 'doctor@example.com' })
    @IsNotEmpty()
    @IsEmail()
    email!: string;

    @ApiProperty({
        example: 'https://app.example.com/reset-password',
        description: 'Client reset-password route used when generating email links.',
    })
    @IsNotEmpty()
    @IsString()
    clientUri!: string;
}

@Injectable()
export class ForgetPasswordHandler {
    constructor(
        @InjectRepository(UserEntity)
        private readonly usersRepository: Repository<UserEntity>,
        @InjectRepository(UserSessionEntity)
        private readonly sessionsRepository: Repository<UserSessionEntity>,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    private generateAccessToken(user: UserEntity): string {
        const payload = {
            sub: user.id,
            nameIdentifier: user.id,
            name: user.userName,
            jti: randomUUID(),
            iat: Math.floor(Date.now() / 1000),
        };

        const expiresInMinutes = this.configService.get<number>(
            'JWT_ACCESS_TOKEN_LIFETIME_MINUTES',
            50,
        );

        return this.jwtService.sign(payload, {
            secret: this.configService.getOrThrow<string>('JWT_SECRET_KEY'),
            issuer: this.configService.getOrThrow<string>('JWT_ISSUER'),
            audience: this.configService.getOrThrow<string>('JWT_AUDIENCE'),
            expiresIn: expiresInMinutes * 60,
        });
    }

    async handle(command: ForgetPasswordCommandDto): Promise<void> {
        const user = await this.usersRepository.findOne({
            where: { email: command.email },
        });

        if (!user) {
            throw UsersErrors.userNotFoundByEmail(command.email);
        }

        const token = this.generateAccessToken(user);

        const userSession = this.sessionsRepository.create({
            userId: user.id,
            token,
            tokenType: UserSessionTokenType.ResetPassword,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        });

        await this.sessionsRepository.save(userSession);
    }
}

@Controller('auth')
@ApiTags('Auth')
export class ForgetPasswordEndpoint {
    constructor(private readonly handler: ForgetPasswordHandler) { }

    @Post('forget-password')
    @HttpCode(204)
    @ApiOperation({
        summary: 'Start password reset',
        description:
            'Creates a short-lived reset session token for the provided user email.',
    })
    @ApiBody({ type: ForgetPasswordCommandDto })
    @ApiNoContentResponse({
        description: 'Reset flow created successfully. Response body is empty.',
    })
    @ApiValidationErrorResponse()
    @ApiErrorResponses(UsersErrorDocs.userNotFoundByEmail)
    @ApiUnexpectedServerErrorResponse()
    async execute(@Body() command: ForgetPasswordCommandDto): Promise<void> {
        await this.handler.handle(command);
    }
}
