import { PaymentStatus } from '../../../src/modules/payments/entities/payment-status.enum';
import { PaymentsIntegrationBase } from './payments-integration-base';

jest.setTimeout(180_000);

class PaymentsIntegrationSuite extends PaymentsIntegrationBase { }

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

    it('should return unauthorized when checkout endpoint is called without token', async () => {
        await suite
            .api()
            .post('/api/v1/payments/checkout')
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
