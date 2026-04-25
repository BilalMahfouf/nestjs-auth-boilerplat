import {
    BadRequestException,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import {
    CreateCheckoutCommandDto,
    CreateCheckoutHandler,
} from '../../../src/modules/payments/features/create-checkout.feature';
import { PaymentStatus } from '../../../src/modules/payments/entities/payment-status.enum';

describe('CreateCheckoutHandler', () => {
    const paymentsRepository = {
        findOne: jest.fn(),
        save: jest.fn(),
    };

    const usersRepository = {
        exists: jest.fn(),
    };

    const paymentService = {
        process: jest.fn(),
        getCheckoutByProviderPaymentId: jest.fn(),
    };

    let handler: CreateCheckoutHandler;

    beforeEach(() => {
        jest.clearAllMocks();
        paymentsRepository.findOne.mockResolvedValue(null);
        paymentService.getCheckoutByProviderPaymentId.mockResolvedValue(null);

        handler = new CreateCheckoutHandler(
            paymentsRepository as never,
            usersRepository as never,
            paymentService as never,
        );
    });

    it('should create checkout when user exists and provider succeeds', async () => {
        usersRepository.exists.mockResolvedValue(true);
        paymentService.process.mockResolvedValue({
            providerPaymentId: 'provider-1',
            providerMetadata: '{"mode":"in-memory"}',
            checkoutUri: 'https://checkout.example.com/provider-1',
        });
        paymentService.getCheckoutByProviderPaymentId.mockResolvedValue({
            checkoutUri: 'https://checkout.example.com/provider-1',
        });
        paymentsRepository.save.mockResolvedValue({
            id: 'payment-1',
            status: PaymentStatus.Pending,
            provider: 'InMemoryProvider',
            providerPaymentId: 'provider-1',
            idempotencyKey: 'idem-1',
            amount: '59.99',
            currency: 'USD',
        });

        const command: CreateCheckoutCommandDto = {
            amount: 59.99,
            currency: 'USD',
        };

        const result = await handler.handle('user-1', command, 'idem-1');

        expect(result.paymentId).toBe('payment-1');
        expect(result.status).toBe(PaymentStatus.Pending);
        expect(result.providerPaymentId).toBe('provider-1');
        expect(result.amount).toBe(59.99);
        expect(result.currency).toBe('USD');
        expect(result.checkoutUri).toBe('https://checkout.example.com/provider-1');
    });

    it('should return existing payment and fetch checkout when idempotency key already exists', async () => {
        paymentsRepository.findOne.mockResolvedValue({
            id: 'payment-existing',
            status: PaymentStatus.Pending,
            provider: 'InMemoryProvider',
            providerPaymentId: 'provider-existing',
            idempotencyKey: 'idem-existing',
            amount: '59.99',
            currency: 'USD',
        });
        paymentService.getCheckoutByProviderPaymentId.mockResolvedValue({
            checkoutUri: 'https://checkout.example.com/provider-existing',
        });

        const command: CreateCheckoutCommandDto = {
            amount: 59.99,
            currency: 'USD',
        };

        const result = await handler.handle('user-1', command, 'idem-existing');

        expect(result.paymentId).toBe('payment-existing');
        expect(result.providerPaymentId).toBe('provider-existing');
        expect(result.checkoutUri).toBe('https://checkout.example.com/provider-existing');
        expect(paymentService.process).not.toHaveBeenCalled();
        expect(paymentsRepository.save).not.toHaveBeenCalled();
    });

    it('should throw not found when existing idempotent payment has no provider payment id', async () => {
        paymentsRepository.findOne.mockResolvedValue({
            id: 'payment-existing',
            status: PaymentStatus.Pending,
            provider: 'InMemoryProvider',
            providerPaymentId: null,
            idempotencyKey: 'idem-existing',
            amount: '59.99',
            currency: 'USD',
        });

        const command: CreateCheckoutCommandDto = {
            amount: 59.99,
            currency: 'USD',
        };

        await expect(
            handler.handle('user-1', command, 'idem-existing'),
        ).rejects.toBeInstanceOf(NotFoundException);

        expect(paymentService.getCheckoutByProviderPaymentId).not.toHaveBeenCalled();
        expect(paymentService.process).not.toHaveBeenCalled();
    });

    it('should throw not found when provider checkout lookup returns null for existing idempotent payment', async () => {
        paymentsRepository.findOne.mockResolvedValue({
            id: 'payment-existing',
            status: PaymentStatus.Pending,
            provider: 'InMemoryProvider',
            providerPaymentId: 'provider-existing',
            idempotencyKey: 'idem-existing',
            amount: '59.99',
            currency: 'USD',
        });
        paymentService.getCheckoutByProviderPaymentId.mockResolvedValue(null);

        const command: CreateCheckoutCommandDto = {
            amount: 59.99,
            currency: 'USD',
        };

        await expect(
            handler.handle('user-1', command, 'idem-existing'),
        ).rejects.toBeInstanceOf(NotFoundException);

        expect(paymentService.process).not.toHaveBeenCalled();
        expect(paymentsRepository.save).not.toHaveBeenCalled();
    });

    it('should throw not found when user does not exist', async () => {
        usersRepository.exists.mockResolvedValue(false);

        const command: CreateCheckoutCommandDto = {
            amount: 59.99,
            currency: 'USD',
        };

        await expect(
            handler.handle('missing-user', command, 'idem-1'),
        ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw internal server error when provider processing fails', async () => {
        usersRepository.exists.mockResolvedValue(true);
        paymentService.process.mockRejectedValue(new Error('provider unavailable'));

        const command: CreateCheckoutCommandDto = {
            amount: 59.99,
            currency: 'USD',
        };

        await expect(
            handler.handle('user-1', command, 'idem-1'),
        ).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('should normalize currency to uppercase when input is lowercase', async () => {
        usersRepository.exists.mockResolvedValue(true);
        paymentService.process.mockResolvedValue({
            providerPaymentId: 'provider-1',
            providerMetadata: null,
        });
        paymentService.getCheckoutByProviderPaymentId.mockResolvedValue({
            checkoutUri: 'https://checkout.example.com/provider-1',
        });
        paymentsRepository.save.mockResolvedValue({
            id: 'payment-1',
            status: PaymentStatus.Pending,
            provider: 'InMemoryProvider',
            providerPaymentId: 'provider-1',
            idempotencyKey: 'idem-1',
            amount: '20.00',
            currency: 'USD',
        });

        const command: CreateCheckoutCommandDto = {
            amount: 20,
            currency: 'usd',
        };

        const result = await handler.handle('user-1', command, 'idem-1');

        expect(result.currency).toBe('USD');
        expect(paymentsRepository.save).toHaveBeenCalledWith(
            expect.objectContaining({ currency: 'USD' }),
        );
    });

    it('should throw bad request when idempotency key is missing', async () => {
        const command: CreateCheckoutCommandDto = {
            amount: 59.99,
            currency: 'USD',
        };

        await expect(
            handler.handle('user-1', command, '   '),
        ).rejects.toBeInstanceOf(BadRequestException);
    });
});
