import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import type { Response } from 'express';

@Injectable()
export class UsersAuthHelpers {
  constructor(private readonly configService: ConfigService) {}

  generateRefreshToken(): string {
    return randomBytes(32).toString('base64');
  }

  refreshCookieName(): string {
    return this.configService.get<string>(
      'REFRESH_TOKEN_COOKIE_NAME',
      'refreshToken',
    );
  }

  refreshCookieDays(): number {
    return this.configService.get<number>('REFRESH_TOKEN_DAYS', 7);
  }

  setRefreshTokenCookie(
    response: Response,
    refreshToken: string,
    expiresAt: Date,
  ): void {
    response.cookie(this.refreshCookieName(), refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      expires: expiresAt,
    });
  }

  clearRefreshTokenCookie(response: Response): void {
    response.clearCookie(this.refreshCookieName(), {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
  }
}
