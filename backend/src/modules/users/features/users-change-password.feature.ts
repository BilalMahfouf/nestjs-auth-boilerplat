import {
  Body,
  Controller,
  HttpCode,
  Injectable,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import {
  CurrentUser,
  type CurrentUserContext,
} from '../../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { UserEntity } from '../entities/user.entity';
import { UsersErrors } from '../users.errors';
import {
  ApiBody,
  ApiOkResponse,
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

export class ChangePasswordCommandDto {
  @ApiProperty({ example: 'CurrentPassword123' })
  @IsNotEmpty()
  @IsString()
  currentPassword!: string;

  @ApiProperty({ example: 'NewPassword123', minLength: 6 })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  newPassword!: string;

  @ApiProperty({ example: 'NewPassword123', minLength: 6 })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  confirmNewPassword!: string;
}

@Injectable()
export class ChangePasswordHandler {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async handle(
    currentUserId: string,
    command: ChangePasswordCommandDto,
  ): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id: currentUserId },
    });

    if (!user) {
      throw UsersErrors.userNotFound();
    }

    const isValidCurrentPassword = await bcrypt.compare(
      command.currentPassword,
      user.passwordHash,
    );

    if (!isValidCurrentPassword) {
      throw UsersErrors.invalidPassword();
    }

    if (command.newPassword !== command.confirmNewPassword) {
      throw UsersErrors.invalidPassword();
    }

    if (command.newPassword.length < 6) {
      throw UsersErrors.invalidPasswordLength();
    }

    user.passwordHash = await bcrypt.hash(command.newPassword, 10);
    await this.usersRepository.save(user);
  }
}

@Controller('users')
@ApiTags('Users')
export class ChangePasswordEndpoint {
  constructor(private readonly handler: ChangePasswordHandler) {}

  @Post('change-password')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Change password',
    description: 'Updates the authenticated user password.',
  })
  @ApiAccessTokenAuth()
  @ApiBody({ type: ChangePasswordCommandDto })
  @ApiOkResponse({
    description: 'Password changed successfully. Response body is empty.',
  })
  @ApiValidationErrorResponse()
  @ApiErrorResponses(
    UsersErrorDocs.invalidCredentials,
    UsersErrorDocs.userNotFound,
    UsersErrorDocs.invalidPassword,
    UsersErrorDocs.invalidPasswordLength,
  )
  @ApiUnexpectedServerErrorResponse()
  async execute(
    @CurrentUser() currentUser: CurrentUserContext,
    @Body() command: ChangePasswordCommandDto,
  ): Promise<void> {
    await this.handler.handle(currentUser.userId, command);
  }
}
