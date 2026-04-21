import { ConflictException, NotFoundException } from '@nestjs/common';
import {
    RegisterCommandDto,
    RegisterEndpoint,
    RegisterResponseDto,
} from '../../../src/modules/users/features/auth-register.feature';
import {
    LoginCommandDto,
    LoginEndpoint,
    LoginResponseDto,
} from '../../../src/modules/users/features/auth-login.feature';
import {
    ForgetPasswordCommandDto,
    ForgetPasswordEndpoint,
} from '../../../src/modules/users/features/auth-forget-password.feature';
import { LogoutEndpoint } from '../../../src/modules/users/features/auth-logout.feature';
import {
    MeEndpoint,
    MeResponseDto,
} from '../../../src/modules/users/features/auth-me.feature';
import {
    RefreshTokenEndpoint,
    RefreshTokenResponseDto,
} from '../../../src/modules/users/features/auth-refresh-token.feature';
import {
    ResetPasswordCommandDto,
    ResetPasswordEndpoint,
} from '../../../src/modules/users/features/auth-reset-password.feature';
import {
    ChangeEmailCommandDto,
    ChangeEmailEndpoint,
} from '../../../src/modules/users/features/users-change-email.feature';
import {
    ChangePasswordCommandDto,
    ChangePasswordEndpoint,
} from '../../../src/modules/users/features/users-change-password.feature';
import {
    UpdateUserProfileCommandDto,
    UpdateUserProfileEndpoint,
} from '../../../src/modules/users/features/users-update-profile.feature';

describe('Feature endpoints', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('RegisterEndpoint executes handler successfully', async () => {
        const command: RegisterCommandDto = {
            email: 'doctor@example.com',
            password: 'Password123',
            userName: 'doctor1',
        };
        const response = {} as never;
        const payload: RegisterResponseDto = { token: 'access-token' };
        const handler = { handle: jest.fn().mockResolvedValue(payload) };
        const endpoint = new RegisterEndpoint(handler as never);

        const result = await endpoint.execute(command, response);

        expect(result).toEqual(payload);
        expect(handler.handle).toHaveBeenCalledWith(command, response);
    });

    it('RegisterEndpoint rethrows conflict and unexpected errors', async () => {
        const command: RegisterCommandDto = {
            email: 'doctor@example.com',
            password: 'Password123',
            userName: 'doctor1',
        };
        const response = {} as never;
        const conflict = new ConflictException('already in use');
        const unexpected = new Error('unexpected');
        const handler = { handle: jest.fn() };
        const endpoint = new RegisterEndpoint(handler as never);

        handler.handle.mockRejectedValueOnce(conflict);
        await expect(endpoint.execute(command, response)).rejects.toBe(conflict);

        handler.handle.mockRejectedValueOnce(unexpected);
        await expect(endpoint.execute(command, response)).rejects.toBe(unexpected);
    });

    it('LoginEndpoint executes handler successfully', async () => {
        const command: LoginCommandDto = {
            email: 'doctor@example.com',
            password: 'Password123',
        };
        const response = {} as never;
        const payload: LoginResponseDto = { token: 'access-token' };
        const handler = { handle: jest.fn().mockResolvedValue(payload) };
        const endpoint = new LoginEndpoint(handler as never);

        const result = await endpoint.execute(command, response);

        expect(result).toEqual(payload);
        expect(handler.handle).toHaveBeenCalledWith(command, response);
    });

    it('LoginEndpoint rethrows not found and unexpected errors', async () => {
        const command: LoginCommandDto = {
            email: 'doctor@example.com',
            password: 'Password123',
        };
        const response = {} as never;
        const notFound = new NotFoundException('not found');
        const unexpected = new Error('unexpected');
        const handler = { handle: jest.fn() };
        const endpoint = new LoginEndpoint(handler as never);

        handler.handle.mockRejectedValueOnce(notFound);
        await expect(endpoint.execute(command, response)).rejects.toBe(notFound);

        handler.handle.mockRejectedValueOnce(unexpected);
        await expect(endpoint.execute(command, response)).rejects.toBe(unexpected);
    });

    it('ForgetPasswordEndpoint delegates to handler', async () => {
        const command: ForgetPasswordCommandDto = {
            email: 'doctor@example.com',
            clientUri: 'https://app.example.com/reset-password',
        };
        const handler = { handle: jest.fn().mockResolvedValue(undefined) };
        const endpoint = new ForgetPasswordEndpoint(handler as never);

        await expect(endpoint.execute(command)).resolves.toBeUndefined();
        expect(handler.handle).toHaveBeenCalledWith(command);
    });

    it('LogoutEndpoint delegates to handler', async () => {
        const request = {} as never;
        const response = {} as never;
        const handler = { handle: jest.fn().mockResolvedValue(undefined) };
        const endpoint = new LogoutEndpoint(handler as never);

        await expect(endpoint.execute(request, response)).resolves.toBeUndefined();
        expect(handler.handle).toHaveBeenCalledWith(request, response);
    });

    it('MeEndpoint delegates to handler with current user id', async () => {
        const payload: MeResponseDto = {
            id: 'user-1',
            userName: 'doctor1',
            email: 'doctor@example.com',
            role: 'Doctor',
            isActive: true,
            clinicInfromationCompleted: false,
            subscriptionStatus: null,
            isSubscriptionExist: null,
            createdOnUtc: new Date(),
        };
        const handler = { handle: jest.fn().mockResolvedValue(payload) };
        const endpoint = new MeEndpoint(handler as never);

        const result = await endpoint.execute({ userId: 'user-1' } as never);

        expect(result).toEqual(payload);
        expect(handler.handle).toHaveBeenCalledWith('user-1');
    });

    it('RefreshTokenEndpoint delegates to handler', async () => {
        const request = {} as never;
        const response = {} as never;
        const payload: RefreshTokenResponseDto = { token: 'rotated-access-token' };
        const handler = { handle: jest.fn().mockResolvedValue(payload) };
        const endpoint = new RefreshTokenEndpoint(handler as never);

        const result = await endpoint.execute(request, response);

        expect(result).toEqual(payload);
        expect(handler.handle).toHaveBeenCalledWith(request, response);
    });

    it('ResetPasswordEndpoint delegates to handler', async () => {
        const command: ResetPasswordCommandDto = {
            email: 'doctor@example.com',
            token: 'reset-token',
            password: 'Password123',
            confirmPassword: 'Password123',
        };
        const handler = { handle: jest.fn().mockResolvedValue(undefined) };
        const endpoint = new ResetPasswordEndpoint(handler as never);

        await expect(endpoint.execute(command)).resolves.toBeUndefined();
        expect(handler.handle).toHaveBeenCalledWith(command);
    });

    it('ChangeEmailEndpoint delegates to handler', async () => {
        const command: ChangeEmailCommandDto = {
            email: 'new-email@example.com',
        };
        const handler = { handle: jest.fn().mockResolvedValue(undefined) };
        const endpoint = new ChangeEmailEndpoint(handler as never);

        await expect(
            endpoint.execute({ userId: 'user-1' } as never, command),
        ).resolves.toBeUndefined();
        expect(handler.handle).toHaveBeenCalledWith('user-1', command);
    });

    it('ChangePasswordEndpoint delegates to handler', async () => {
        const command: ChangePasswordCommandDto = {
            currentPassword: 'OldPassword123',
            newPassword: 'NewPassword123',
            confirmNewPassword: 'NewPassword123',
        };
        const handler = { handle: jest.fn().mockResolvedValue(undefined) };
        const endpoint = new ChangePasswordEndpoint(handler as never);

        await expect(
            endpoint.execute({ userId: 'user-1' } as never, command),
        ).resolves.toBeUndefined();
        expect(handler.handle).toHaveBeenCalledWith('user-1', command);
    });

    it('UpdateUserProfileEndpoint delegates to handler', async () => {
        const command: UpdateUserProfileCommandDto = {
            userName: 'doctor-updated',
        };
        const handler = { handle: jest.fn().mockResolvedValue(undefined) };
        const endpoint = new UpdateUserProfileEndpoint(handler as never);

        await expect(
            endpoint.execute({ userId: 'user-1' } as never, command),
        ).resolves.toBeUndefined();
        expect(handler.handle).toHaveBeenCalledWith('user-1', command);
    });
});