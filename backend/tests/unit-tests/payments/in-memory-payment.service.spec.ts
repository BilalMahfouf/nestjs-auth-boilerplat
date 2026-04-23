import { InMemoryPaymentService } from '../../../src/modules/payments/services/in-memory-payment.service';

describe('InMemoryPaymentService', () => {
    let service: InMemoryPaymentService;

    beforeEach(() => {
        service = new InMemoryPaymentService();
    });

    it('should return provider payment details when process is called', async () => {
        const result = await service.process(15.5, 'USD');

        expect(result.providerPaymentId).toContain('in-memory-');
        expect(result.providerMetadata).toContain('in-memory');
        expect(result.checkoutUri).toContain(result.providerPaymentId);
    });

    it('should get checkout details by provider payment id', async () => {
        const checkout = await service.getCheckoutByProviderPaymentId('in-memory-test-id');

        expect(checkout).not.toBeNull();
        expect(checkout?.checkoutUri).toBe(
            'https://checkout.in-memory.local/payments/in-memory-test-id',
        );
    });
});
