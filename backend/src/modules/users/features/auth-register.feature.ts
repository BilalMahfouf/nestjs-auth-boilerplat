import {
  Body,
  Controller,
  Post,
  Res,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import type { Response } from 'express';
import { randomUUID } from 'crypto';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { UserEntity, UserRole } from '../entities/user.entity';
import {
  UserSessionEntity,
  UserSessionTokenType,
} from '../entities/user-session.entity';
import { UsersAuthHelpers } from '../users-auth.helpers';
import { UsersErrors } from '../users.errors';
import * as bcrypt from 'bcrypt';
import {
  ApiBody,
  ApiCreatedResponse,
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

export class RegisterCommandDto {
  @ApiProperty({ example: 'doctor@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Secret123', minLength: 6 })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'drhouse' })
  @IsNotEmpty()
  @IsString()
  userName!: string;
}

export class RegisterResponseDto {
  @ApiProperty({
    example: '<jwt-access-token>',
    description: 'JWT access token for Authorization header.',
  })
  token!: string;
}

@Injectable()
export class RegisterHandler {
  constructor(
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authHelpers: UsersAuthHelpers,
  ) {}

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

  async handle(
    command: RegisterCommandDto,
    response: Response,
  ): Promise<RegisterResponseDto> {
    const { token, refreshToken, refreshExpiresAt } =
      await this.dataSource.transaction(async (manager) => {
        const usersRepository = manager.getRepository(UserEntity);
        const sessionsRepository = manager.getRepository(UserSessionEntity);

        const isEmailInUse = await usersRepository.exists({
          where: { email: command.email },
        });

        if (isEmailInUse) {
          throw UsersErrors.emailAlreadyInUse(command.email);
        }

        const hashPassword = await bcrypt.hash(command.password, 10);

        const user = usersRepository.create({
          userName: command.userName,
          email: command.email,
          passwordHash: hashPassword,
          role: UserRole.Doctor,
          isActive: true,
        });

        const savedUser = await usersRepository.save(user);

        const token = this.generateAccessToken(savedUser);
        const refreshToken = this.authHelpers.generateRefreshToken();

        const refreshExpiresAt = new Date(
          Date.now() +
            this.authHelpers.refreshCookieDays() * 24 * 60 * 60 * 1000,
        );

        const userSession = sessionsRepository.create({
          userId: savedUser.id,
          token: refreshToken,
          tokenType: UserSessionTokenType.Refresh,
          expiresAt: refreshExpiresAt,
        });

        await sessionsRepository.save(userSession);

        return { token, refreshToken, refreshExpiresAt };
      });

    this.authHelpers.setRefreshTokenCookie(
      response,
      refreshToken,
      refreshExpiresAt,
    );

    return { token };
  }
}

@Controller('auth')
@ApiTags('Auth')
export class RegisterEndpoint {
  constructor(private readonly handler: RegisterHandler) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register account',
    description:
      'Creates a new user account, returns a JWT access token, and sets a refresh token cookie.',
  })
  @ApiBody({ type: RegisterCommandDto })
  @ApiCreatedResponse({
    description: 'Account created successfully.',
    type: RegisterResponseDto,
    headers: {
      'Set-Cookie': {
        description: 'HttpOnly refresh token cookie.',
        schema: { type: 'string' },
      },
    },
  })
  @ApiValidationErrorResponse()
  @ApiErrorResponses(UsersErrorDocs.emailAlreadyInUse)
  @ApiUnexpectedServerErrorResponse()
  async execute(
    @Body() command: RegisterCommandDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<RegisterResponseDto> {
    try {
      return await this.handler.handle(command, response);
    } catch (error: unknown) {
      if (error instanceof ConflictException) {
        throw error;
      }

      throw error;
    }
  }
}
