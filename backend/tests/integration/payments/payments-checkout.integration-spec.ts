import { PaymentStatus } from '../../../src/modules/payments/entities/payment-status.enum';
import {
    PAYMENT_SERVICE,
    type PaymentService,
} from '../../../src/modules/payments/services/payment.service';
import { PaymentsIntegrationBase } from './payments-integration-base';

jest.setTimeout(180_000);

class PaymentsIntegrationSuite extends PaymentsIntegrationBase {
    get paymentService(): PaymentService {
        return this.app.get<PaymentService>(PAYMENT_SERVICE);
    }
}

const suite = new PaymentsIntegrationSuite();

describe('Payments checkout integration', () => {
    beforeAll(async () => {
        await suite.initialize();
    });

    beforeEach(async () => {
        await suite.resetDatabase();
    });

    afterAll(async () => {
        await suite.dispose();
    });

    it('should create pending payment when checkout endpoint is called with valid token', async () => {
        const user = await suite.seedUser({
            email: 'payments-checkout@example.com',
            userName: 'paymentsCheckout',
        });

        const loginResult = await suite.loginHandler.handle(
            { email: user.email, password: 'Password123!' },
            suite.createResponseMock() as never,
        );

        const response = await suite
            .api()
            .post('/api/v1/payments/checkout')
            .set('Authorization', suite.buildBearerToken(loginResult.token))
            .set('idempotency-key', 'idem-checkout-1')
            .send({ amount: 42.75, currency: 'USD' })
            .expect(201);

        expect(response.status).toBe(201);

        const savedPayment = await suite.paymentsRepository.findOne({
            where: { userId: user.id, currency: 'USD' },
            order: { createdOnUtc: 'DESC' },
        });

        expect(savedPayment).not.toBeNull();
        expect(savedPayment).toMatchObject({
            userId: user.id,
            status: PaymentStatus.Pending,
            currency: 'USD',
            provider: 'InMemoryProvider',
        });

        if (!savedPayment) {
            throw new Error('Payment was not persisted');
        }

        expect(savedPayment.providerPaymentId).toEqual(expect.any(String));
        expect(savedPayment.idempotencyKey).toEqual(expect.any(String));
    });

    it('should return existing checkout when same idempotency-key is reused', async () => {
        const user = await suite.seedUser({
            email: 'payments-idempotent-existing@example.com',
            userName: 'paymentsIdempotentExisting',
        });

        const loginResult = await suite.loginHandler.handle(
            { email: user.email, password: 'Password123!' },
            suite.createResponseMock() as never,
        );

        const token = suite.buildBearerToken(loginResult.token);
        const idempotencyKey = 'idem-checkout-reuse-1';
        const payload = { amount: 42.75, currency: 'USD' };

        const first = await suite
            .api()
            .post('/api/v1/payments/checkout')
            .set('Authorization', token)
            .set('idempotency-key', idempotencyKey)
            .send(payload)
            .expect(201);

        const second = await suite
            .api()
            .post('/api/v1/payments/checkout')
            .set('Authorization', token)
            .set('idempotency-key', idempotencyKey)
            .send(payload)
            .expect(201);

        expect(second.body.paymentId).toBe(first.body.paymentId);
        expect(second.body.providerPaymentId).toBe(first.body.providerPaymentId);
        expect(second.body.checkoutUri).toBe(first.body.checkoutUri);

        const sameKeyPayments = await suite.paymentsRepository.find({
            where: { idempotencyKey },
        });
        expect(sameKeyPayments).toHaveLength(1);
    });

    it('should return original checkout when same idempotency-key is reused with different payload', async () => {
        const user = await suite.seedUser({
            email: 'payments-idempotent-different-body@example.com',
            userName: 'paymentsIdempotentDifferentBody',
        });

        const loginResult = await suite.loginHandler.handle(
            { email: user.email, password: 'Password123!' },
            suite.createResponseMock() as never,
        );

        const token = suite.buildBearerToken(loginResult.token);
        const idempotencyKey = 'idem-checkout-reuse-different-body';

        const first = await suite
            .api()
            .post('/api/v1/payments/checkout')
            .set('Authorization', token)
            .set('idempotency-key', idempotencyKey)
            .send({ amount: 42.75, currency: 'USD' })
            .expect(201);

        const second = await suite
            .api()
            .post('/api/v1/payments/checkout')
            .set('Authorization', token)
            .set('idempotency-key', idempotencyKey)
            .send({ amount: 13.5, currency: 'EUR' })
            .expect(201);

        expect(second.body.paymentId).toBe(first.body.paymentId);
        expect(second.body.providerPaymentId).toBe(first.body.providerPaymentId);
        expect(second.body.checkoutUri).toBe(first.body.checkoutUri);
        expect(second.body.amount).toBe(first.body.amount);
        expect(second.body.currency).toBe(first.body.currency);

        const sameKeyPayments = await suite.paymentsRepository.find({
            where: { idempotencyKey },
        });
        expect(sameKeyPayments).toHaveLength(1);
    });

    it('should return not found when idempotent record has no provider payment id', async () => {
        const user = await suite.seedUser({
            email: 'payments-idempotent-null-provider-id@example.com',
            userName: 'paymentsIdempotentNullProviderId',
        });

        const payment = suite.paymentsRepository.create({
            userId: user.id,
            amount: '21.00',
            currency: 'USD',
            status: PaymentStatus.Pending,
            provider: 'InMemoryProvider',
            providerPaymentId: null,
            idempotencyKey: 'idem-checkout-existing-no-provider-id',
            providerMetadata: null,
            failureReason: null,
            paidAt: null,
        });

        const saved = await suite.paymentsRepository.save(payment);

        const loginResult = await suite.loginHandler.handle(
            { email: user.email, password: 'Password123!' },
            suite.createResponseMock() as never,
        );

        const response = await suite
            .api()
            .post('/api/v1/payments/checkout')
            .set('Authorization', suite.buildBearerToken(loginResult.token))
            .set('idempotency-key', saved.idempotencyKey)
            .send({ amount: 99.99, currency: 'USD' })
            .expect(404);

        expect(response.body.code).toBe('Payment.CheckoutNotFound');
    });

    it('should return unauthorized when checkout endpoint is called without token', async () => {
        await suite
            .api()
            .post('/api/v1/payments/checkout')
            .send({ amount: 42.75, currency: 'USD' })
            .expect(401);
    });

    it('should return unauthorized when checkout endpoint is called with invalid token', async () => {
        await suite
            .api()
            .post('/api/v1/payments/checkout')
            .set('Authorization', 'Bearer invalid-token')
            .set('idempotency-key', 'idem-invalid-token')
            .send({ amount: 42.75, currency: 'USD' })
            .expect(401);
    });

    it('should return bad request when idempotency-key header is missing', async () => {
        const user = await suite.seedUser({
            email: 'payments-missing-idem@example.com',
            userName: 'paymentsMissingIdem',
        });

        const loginResult = await suite.loginHandler.handle(
            { email: user.email, password: 'Password123!' },
            suite.createResponseMock() as never,
        );

        await suite
            .api()
            .post('/api/v1/payments/checkout')
            .set('Authorization', suite.buildBearerToken(loginResult.token))
            .send({ amount: 42.75, currency: 'USD' })
            .expect(400);
    });

    it('should return bad request when idempotency-key header is blank', async () => {
        const user = await suite.seedUser({
            email: 'payments-blank-idem@example.com',
            userName: 'paymentsBlankIdem',
        });

        const loginResult = await suite.loginHandler.handle(
            { email: user.email, password: 'Password123!' },
            suite.createResponseMock() as never,
        );

        const response = await suite
            .api()
            .post('/api/v1/payments/checkout')
            .set('Authorization', suite.buildBearerToken(loginResult.token))
            .set('idempotency-key', '   ')
            .send({ amount: 42.75, currency: 'USD' })
            .expect(400);

        expect(response.body.code).toBe('Payment.IdempotencyKeyRequired');
    });

    it('should return bad request when amount is zero', async () => {
        const user = await suite.seedUser({
            email: 'payments-invalid-amount-zero@example.com',
            userName: 'paymentsInvalidAmountZero',
        });

        const loginResult = await suite.loginHandler.handle(
            { email: user.email, password: 'Password123!' },
            suite.createResponseMock() as never,
        );

        await suite
            .api()
            .post('/api/v1/payments/checkout')
            .set('Authorization', suite.buildBearerToken(loginResult.token))
            .set('idempotency-key', 'idem-invalid-amount-zero')
            .send({ amount: 0, currency: 'USD' })
            .expect(400);
    });

    it('should return bad request when amount has more than two decimal places', async () => {
        const user = await suite.seedUser({
            email: 'payments-invalid-amount-decimals@example.com',
            userName: 'paymentsInvalidAmountDecimals',
        });

        const loginResult = await suite.loginHandler.handle(
            { email: user.email, password: 'Password123!' },
            suite.createResponseMock() as never,
        );

        await suite
            .api()
            .post('/api/v1/payments/checkout')
            .set('Authorization', suite.buildBearerToken(loginResult.token))
            .set('idempotency-key', 'idem-invalid-amount-decimals')
            .send({ amount: 10.123, currency: 'USD' })
            .expect(400);
    });

    it('should return bad request when currency is lowercase', async () => {
        const user = await suite.seedUser({
            email: 'payments-invalid-currency-lowercase@example.com',
            userName: 'paymentsInvalidCurrencyLowercase',
        });

        const loginResult = await suite.loginHandler.handle(
            { email: user.email, password: 'Password123!' },
            suite.createResponseMock() as never,
        );

        await suite
            .api()
            .post('/api/v1/payments/checkout')
            .set('Authorization', suite.buildBearerToken(loginResult.token))
            .set('idempotency-key', 'idem-invalid-currency-lowercase')
            .send({ amount: 10, currency: 'usd' })
            .expect(400);
    });

    it('should return bad request when currency length is invalid', async () => {
        const user = await suite.seedUser({
            email: 'payments-invalid-currency-length@example.com',
            userName: 'paymentsInvalidCurrencyLength',
        });

        const loginResult = await suite.loginHandler.handle(
            { email: user.email, password: 'Password123!' },
            suite.createResponseMock() as never,
        );

        await suite
            .api()
            .post('/api/v1/payments/checkout')
            .set('Authorization', suite.buildBearerToken(loginResult.token))
            .set('idempotency-key', 'idem-invalid-currency-length')
            .send({ amount: 10, currency: 'US' })
            .expect(400);
    });

    it('should return internal server error when payment provider process fails', async () => {
        const user = await suite.seedUser({
            email: 'payments-provider-failure@example.com',
            userName: 'paymentsProviderFailure',
        });

        const loginResult = await suite.loginHandler.handle(
            { email: user.email, password: 'Password123!' },
            suite.createResponseMock() as never,
        );

        const providerProcessSpy = jest
            .spyOn(suite.paymentService, 'process')
            .mockRejectedValueOnce(new Error('simulated provider error'));

        const response = await suite
            .api()
            .post('/api/v1/payments/checkout')
            .set('Authorization', suite.buildBearerToken(loginResult.token))
            .set('idempotency-key', 'idem-provider-failure')
            .send({ amount: 77.5, currency: 'USD' })
            .expect(500);

        expect(response.body.code).toBe('Payment.ProviderProcessFailed');
        providerProcessSpy.mockRestore();
    });

    it('should return not found when authenticated user no longer exists', async () => {
        const user = await suite.seedUser({
            email: 'payments-not-found@example.com',
            userName: 'paymentsNotFound',
        });

        const loginResult = await suite.loginHandler.handle(
            { email: user.email, password: 'Password123!' },
            suite.createResponseMock() as never,
        );

        await suite.usersRepository.delete(user.id);

        await suite
            .api()
            .post('/api/v1/payments/checkout')
            .set('Authorization', suite.buildBearerToken(loginResult.token))
            .set('idempotency-key', 'idem-checkout-2')
            .send({ amount: 10, currency: 'USD' })
            .expect(404);
    });
});
