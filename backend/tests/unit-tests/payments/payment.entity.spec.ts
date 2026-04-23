import { PaymentEntity } from '../../../src/modules/payments/entities/payment.entity';
import { PaymentStatus } from '../../../src/modules/payments/entities/payment-status.enum';

describe('PaymentEntity', () => {
  it('should create pending payment when payload is valid', () => {
    const payment = PaymentEntity.createPending({
      userId: '8f09d08f-cc7e-42c8-9822-0f8c7d7d3d2e',
      amount: 99.9,
      currency: 'usd',
      provider: 'InMemoryProvider',
      idempotencyKey: 'fixed-key',
    });

    expect(payment.userId).toBe('8f09d08f-cc7e-42c8-9822-0f8c7d7d3d2e');
    expect(payment.amount).toBe('99.90');
    expect(payment.currency).toBe('USD');
    expect(payment.status).toBe(PaymentStatus.Pending);
    expect(payment.provider).toBe('InMemoryProvider');
    expect(payment.idempotencyKey).toBe('fixed-key');
  });

  it('should throw when amount is not positive', () => {
    expect(() =>
      PaymentEntity.createPending({
        userId: '8f09d08f-cc7e-42c8-9822-0f8c7d7d3d2e',
        amount: 0,
        currency: 'USD',
        provider: 'InMemoryProvider',
        idempotencyKey: 'fixed-key',
      }),
    ).toThrow('Payment.InvalidAmount');
  });

  it('should throw when currency is invalid', () => {
    expect(() =>
      PaymentEntity.createPending({
        userId: '8f09d08f-cc7e-42c8-9822-0f8c7d7d3d2e',
        amount: 10,
        currency: 'US',
        provider: 'InMemoryProvider',
        idempotencyKey: 'fixed-key',
      }),
    ).toThrow('Payment.InvalidCurrency');
  });

  it('should throw when provider is empty', () => {
    expect(() =>
      PaymentEntity.createPending({
        userId: '8f09d08f-cc7e-42c8-9822-0f8c7d7d3d2e',
        amount: 10,
        currency: 'USD',
        provider: '   ',
        idempotencyKey: 'fixed-key',
      }),
    ).toThrow('Payment.InvalidProvider');
  });

  it('should throw when idempotency key is empty', () => {
    expect(() =>
      PaymentEntity.createPending({
        userId: '8f09d08f-cc7e-42c8-9822-0f8c7d7d3d2e',
        amount: 10,
        currency: 'USD',
        provider: 'InMemoryProvider',
        idempotencyKey: '   ',
      }),
    ).toThrow('Payment.InvalidIdempotencyKey');
  });

  it('should mark paid when markPaid is called', () => {
    const payment = PaymentEntity.createPending({
      userId: '8f09d08f-cc7e-42c8-9822-0f8c7d7d3d2e',
      amount: 30,
      currency: 'USD',
      provider: 'InMemoryProvider',
      idempotencyKey: 'fixed-key',
    });

    payment.markPaid('paid-meta');

    expect(payment.status).toBe(PaymentStatus.Paid);
    expect(payment.providerMetadata).toBe('paid-meta');
    expect(payment.paidAt).toBeInstanceOf(Date);
  });

  it('should mark failed when markFailed is called', () => {
    const payment = PaymentEntity.createPending({
      userId: '8f09d08f-cc7e-42c8-9822-0f8c7d7d3d2e',
      amount: 30,
      currency: 'USD',
      provider: 'InMemoryProvider',
      idempotencyKey: 'fixed-key',
    });

    payment.markFailed('declined', 'failed-meta');

    expect(payment.status).toBe(PaymentStatus.Failed);
    expect(payment.failureReason).toBe('declined');
    expect(payment.providerMetadata).toBe('failed-meta');
  });

  it('should mark expired when markExpired is called', () => {
    const payment = PaymentEntity.createPending({
      userId: '8f09d08f-cc7e-42c8-9822-0f8c7d7d3d2e',
      amount: 30,
      currency: 'USD',
      provider: 'InMemoryProvider',
      idempotencyKey: 'fixed-key',
    });

    payment.markExpired('timeout', 'expired-meta');

    expect(payment.status).toBe(PaymentStatus.Expired);
    expect(payment.failureReason).toBe('timeout');
    expect(payment.providerMetadata).toBe('expired-meta');
  });

  it('should mark refunded when markRefunded is called', () => {
    const payment = PaymentEntity.createPending({
      userId: '8f09d08f-cc7e-42c8-9822-0f8c7d7d3d2e',
      amount: 30,
      currency: 'USD',
      provider: 'InMemoryProvider',
      idempotencyKey: 'fixed-key',
    });

    payment.markRefunded();

    expect(payment.status).toBe(PaymentStatus.Refunded);
  });

  it('should set provider payment id when setProviderPaymentId is called', () => {
    const payment = PaymentEntity.createPending({
      userId: '8f09d08f-cc7e-42c8-9822-0f8c7d7d3d2e',
      amount: 30,
      currency: 'USD',
      provider: 'InMemoryProvider',
      idempotencyKey: 'fixed-key',
    });

    payment.setProviderPaymentId('provider-123');

    expect(payment.providerPaymentId).toBe('provider-123');
  });

  it('should set provider metadata when setProviderMetadata is called', () => {
    const payment = PaymentEntity.createPending({
      userId: '8f09d08f-cc7e-42c8-9822-0f8c7d7d3d2e',
      amount: 30,
      currency: 'USD',
      provider: 'InMemoryProvider',
      idempotencyKey: 'fixed-key',
    });

    payment.setProviderMetadata('meta-json');

    expect(payment.providerMetadata).toBe('meta-json');
  });
});
