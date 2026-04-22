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
  });
});
