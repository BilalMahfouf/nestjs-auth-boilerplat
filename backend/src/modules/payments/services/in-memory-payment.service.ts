import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PaymentService, ProcessPaymentResult } from './payment.service';

@Injectable()
export class InMemoryPaymentService extends PaymentService {
  process(amount: number, currency: string): Promise<ProcessPaymentResult> {
    return Promise.resolve({
      providerPaymentId: `in-memory-${randomUUID()}`,
      providerMetadata: JSON.stringify({
        mode: 'in-memory',
        amount,
        currency,
      }),
    });
  }
}
