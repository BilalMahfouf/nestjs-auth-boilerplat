import { Controller, Get, Injectable, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser, type CurrentUserContext } from '../../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { UserEntity } from '../entities/user.entity';
import { UsersErrors } from '../users.errors';
import {
    ApiOkResponse,
    ApiOperation,
    ApiProperty,
    ApiTags,
} from '@nestjs/swagger';
import {
    ApiAccessTokenAuth,
    ApiErrorResponses,
    ApiUnexpectedServerErrorResponse,
    UsersErrorDocs,
} from '../../../common/swagger/swagger.responses';

export class MeResponseDto {
    @ApiProperty({ example: '41d2f0f8-b4ce-4f11-8c6f-7fdd2b63e4b6' })
    id!: string;

    @ApiProperty({ example: 'drhouse' })
    userName!: string;

    @ApiProperty({ example: 'doctor@example.com' })
    email!: string;

    @ApiProperty({ example: 'Doctor' })
    role!: string;

    @ApiProperty({ example: true })
    isActive!: boolean;

    @ApiProperty({ example: false })
    clinicInfromationCompleted!: boolean;

    @ApiProperty({ example: null, nullable: true })
    subscriptionStatus!: string | null;

    @ApiProperty({ example: null, nullable: true })
    isSubscriptionExist!: boolean | null;

    @ApiProperty({ example: '2026-04-21T10:00:00.000Z' })
    createdOnUtc!: Date;
}

@Injectable()
export class MeHandler {
    constructor(
        @InjectRepository(UserEntity)
        private readonly usersRepository: Repository<UserEntity>,
    ) { }

    async handle(userId: string): Promise<MeResponseDto> {
        const user = await this.usersRepository.findOne({
            where: { id: userId },
        });

        if (!user) {
            throw UsersErrors.userNotFoundById(userId);
        }

        return {
            id: user.id,
            userName: user.userName,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            clinicInfromationCompleted: false,
            subscriptionStatus: null,
            isSubscriptionExist: null,
            createdOnUtc: user.createdOnUtc,
        };
    }
}

@Controller('auth')
@ApiTags('Auth')
export class MeEndpoint {
    constructor(private readonly handler: MeHandler) { }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({
        summary: 'Get current user',
        description: 'Returns profile information for the authenticated user.',
    })
    @ApiAccessTokenAuth()
    @ApiOkResponse({
        description: 'Current user profile returned successfully.',
        type: MeResponseDto,
    })
    @ApiErrorResponses(UsersErrorDocs.invalidCredentials, UsersErrorDocs.userNotFoundById)
    @ApiUnexpectedServerErrorResponse()
    async execute(@CurrentUser() currentUser: CurrentUserContext): Promise<MeResponseDto> {
        return this.handler.handle(currentUser.userId);
    }
}
