import {
    Body,
    Controller,
    HttpCode,
    Injectable,
    Patch,
    UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { CurrentUser, type CurrentUserContext } from '../../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { UserEntity } from '../entities/user.entity';
import { UsersErrors } from '../users.errors';
import {
    ApiBody,
    ApiNoContentResponse,
    ApiOperation,
    ApiProperty,
    ApiTags,
} from '@nestjs/swagger';
import {
    ApiAccessTokenAuth,
    ApiErrorResponses,
    ApiUnexpectedServerErrorResponse,
    ApiValidationErrorResponse,
    UsersErrorDocs,
} from '../../../common/swagger/swagger.responses';

export class ChangeEmailCommandDto {
    @ApiProperty({ example: 'new-email@example.com' })
    @IsNotEmpty()
    @IsEmail()
    email!: string;
}

@Injectable()
export class ChangeEmailHandler {
    constructor(
        @InjectRepository(UserEntity)
        private readonly usersRepository: Repository<UserEntity>,
    ) { }

    async handle(currentUserId: string, command: ChangeEmailCommandDto): Promise<void> {
        const isEmailInUse = await this.usersRepository.exists({
            where: { email: command.email },
        });

        if (isEmailInUse) {
            throw UsersErrors.emailAlreadyInUse(command.email);
        }

        const user = await this.usersRepository.findOne({
            where: { id: currentUserId },
        });

        if (!user) {
            throw UsersErrors.userNotFoundByEmail(command.email);
        }

        user.updateEmail(command.email);
        await this.usersRepository.save(user);
    }
}

@Controller('users')
@ApiTags('Users')
export class ChangeEmailEndpoint {
    constructor(private readonly handler: ChangeEmailHandler) { }

    @Patch('change-email')
    @HttpCode(204)
    @UseGuards(JwtAuthGuard)
    @ApiOperation({
        summary: 'Change email',
        description: 'Updates the authenticated user email address.',
    })
    @ApiAccessTokenAuth()
    @ApiBody({ type: ChangeEmailCommandDto })
    @ApiNoContentResponse({
        description: 'Email changed successfully. Response body is empty.',
    })
    @ApiValidationErrorResponse()
    @ApiErrorResponses(
        UsersErrorDocs.invalidCredentials,
        UsersErrorDocs.emailAlreadyInUse,
        UsersErrorDocs.userNotFoundByEmail,
    )
    @ApiUnexpectedServerErrorResponse()
    async execute(
        @CurrentUser() currentUser: CurrentUserContext,
        @Body() command: ChangeEmailCommandDto,
    ): Promise<void> {
        await this.handler.handle(currentUser.userId, command);
    }
}
