import {
  Body,
  Controller,
  Injectable,
  NotFoundException,
  Post,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Response } from 'express';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { UserEntity } from '../entities/user.entity';
import {
  UserSessionEntity,
  UserSessionTokenType,
} from '../entities/user-session.entity';
import { UsersAuthHelpers } from '../users-auth.helpers';
import { UsersErrors } from '../users.errors';
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

export class LoginCommandDto {
  @ApiProperty({ example: 'doctor@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Secret123', minLength: 6 })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password!: string;
}

export class LoginResponseDto {
  @ApiProperty({
    example: '<jwt-access-token>',
    description: 'JWT access token for Authorization header.',
  })
  token!: string;
}

@Injectable()
export class LoginHandler {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(UserSessionEntity)
    private readonly sessionsRepository: Repository<UserSessionEntity>,
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
    command: LoginCommandDto,
    response: Response,
  ): Promise<LoginResponseDto> {
    const user = await this.usersRepository.findOne({
      where: { email: command.email },
    });

    if (!user) {
      throw UsersErrors.userNotFoundByEmail(command.email);
    }

    const validPassword = await bcrypt.compare(
      command.password,
      user.passwordHash,
    );

    if (!validPassword) {
      throw UsersErrors.invalidCredentials();
    }

    const token = this.generateAccessToken(user);
    const refreshToken = this.authHelpers.generateRefreshToken();

    const refreshExpiresAt = new Date(
      Date.now() + this.authHelpers.refreshCookieDays() * 24 * 60 * 60 * 1000,
    );

    const userSession = this.sessionsRepository.create({
      userId: user.id,
      token: refreshToken,
      tokenType: UserSessionTokenType.Refresh,
      expiresAt: refreshExpiresAt,
    });

    await this.sessionsRepository.save(userSession);

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
export class LoginEndpoint {
  constructor(private readonly handler: LoginHandler) {}

  @Post('login')
  @ApiOperation({
    summary: 'Login',
    description:
      'Authenticates user credentials, returns a JWT access token, and sets a refresh token cookie.',
  })
  @ApiBody({ type: LoginCommandDto })
  @ApiCreatedResponse({
    description: 'Login successful.',
    type: LoginResponseDto,
    headers: {
      'Set-Cookie': {
        description: 'HttpOnly refresh token cookie.',
        schema: { type: 'string' },
      },
    },
  })
  @ApiValidationErrorResponse()
  @ApiErrorResponses(
    UsersErrorDocs.userNotFoundByEmail,
    UsersErrorDocs.invalidCredentials,
  )
  @ApiUnexpectedServerErrorResponse()
  async execute(
    @Body() command: LoginCommandDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponseDto> {
    try {
      return await this.handler.handle(command, response);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw error;
    }
  }
}
