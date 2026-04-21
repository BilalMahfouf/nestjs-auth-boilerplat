import {
    Body,
    Controller,
    HttpCode,
    Injectable,
    Put,
    UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsNotEmpty, IsString } from 'class-validator';
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

export class UpdateUserProfileCommandDto {
    @ApiProperty({ example: 'drhouse' })
    @IsNotEmpty()
    @IsString()
    userName!: string;
}

@Injectable()
export class UpdateUserProfileHandler {
    constructor(
        @InjectRepository(UserEntity)
        private readonly usersRepository: Repository<UserEntity>,
    ) { }

    async handle(currentUserId: string, command: UpdateUserProfileCommandDto): Promise<void> {
        const user = await this.usersRepository.findOne({
            where: { id: currentUserId },
        });

        if (!user) {
            throw UsersErrors.userNotFound();
        }

        user.updateProfile(command.userName);
        await this.usersRepository.save(user);
    }
}

@Controller('users')
@ApiTags('Users')
export class UpdateUserProfileEndpoint {
    constructor(private readonly handler: UpdateUserProfileHandler) { }

    @Put('update-profile')
    @HttpCode(204)
    @UseGuards(JwtAuthGuard)
    @ApiOperation({
        summary: 'Update profile',
        description: 'Updates username for the authenticated user.',
    })
    @ApiAccessTokenAuth()
    @ApiBody({ type: UpdateUserProfileCommandDto })
    @ApiNoContentResponse({
        description: 'Profile updated successfully. Response body is empty.',
    })
    @ApiValidationErrorResponse()
    @ApiErrorResponses(UsersErrorDocs.invalidCredentials, UsersErrorDocs.userNotFound)
    @ApiUnexpectedServerErrorResponse()
    async execute(
        @CurrentUser() currentUser: CurrentUserContext,
        @Body() command: UpdateUserProfileCommandDto,
    ): Promise<void> {
        await this.handler.handle(currentUser.userId, command);
    }
}
