import { Body, Controller, HttpCode, Injectable, Put } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { UserEntity } from '../entities/user.entity';
import { UserSessionEntity, UserSessionTokenType } from '../entities/user-session.entity';
import { UsersErrors } from '../users.errors';
import {
    ApiBody,
    ApiOkResponse,
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

export class ResetPasswordCommandDto {
    @ApiProperty({ example: 'NewPassword123', minLength: 6 })
    @IsNotEmpty()
    @IsString()
    @MinLength(6)
    password!: string;

    @ApiProperty({ example: 'NewPassword123', minLength: 6 })
    @IsNotEmpty()
    @IsString()
    @MinLength(6)
    confirmPassword!: string;

    @ApiProperty({ example: '<reset-token-from-email-link>' })
    @IsNotEmpty()
    @IsString()
    token!: string;

    @ApiProperty({ example: 'doctor@example.com' })
    @IsNotEmpty()
    @IsEmail()
    email!: string;
}

@Injectable()
export class ResetPasswordHandler {
    constructor(
        @InjectRepository(UserEntity)
        private readonly usersRepository: Repository<UserEntity>,
        @InjectRepository(UserSessionEntity)
        private readonly sessionsRepository: Repository<UserSessionEntity>,
    ) { }

    async handle(command: ResetPasswordCommandDto): Promise<void> {
        const user = await this.usersRepository.findOne({
            where: { email: command.email },
        });

        if (!user) {
            throw UsersErrors.userNotFoundByEmail(command.email);
        }

        const isValidToken = await this.sessionsRepository.exists({
            where: {
                token: command.token,
                tokenType: UserSessionTokenType.ResetPassword,
                expiresAt: MoreThan(new Date()),
            },
        });

        if (!isValidToken) {
            throw UsersErrors.invalidCredentials();
        }

        if (command.password !== command.confirmPassword) {
            throw UsersErrors.invalidPassword();
        }

        if (command.password.length < 6) {
            throw UsersErrors.invalidPasswordLength();
        }

        user.passwordHash = await bcrypt.hash(command.password, 10);
        await this.usersRepository.save(user);
    }
}

@Controller('auth')
@ApiTags('Auth')
export class ResetPasswordEndpoint {
    constructor(private readonly handler: ResetPasswordHandler) { }

    @Put('reset-password')
    @HttpCode(200)
    @ApiOperation({
        summary: 'Reset password',
        description:
            'Validates reset token and updates password for the matching user account.',
    })
    @ApiBody({ type: ResetPasswordCommandDto })
    @ApiOkResponse({
        description: 'Password reset successful. Response body is empty.',
    })
    @ApiValidationErrorResponse()
    @ApiErrorResponses(
        UsersErrorDocs.userNotFoundByEmail,
        UsersErrorDocs.invalidCredentials,
        UsersErrorDocs.invalidPassword,
        UsersErrorDocs.invalidPasswordLength,
    )
    @ApiUnexpectedServerErrorResponse()
    async execute(@Body() command: ResetPasswordCommandDto): Promise<void> {
        await this.handler.handle(command);
    }
}
