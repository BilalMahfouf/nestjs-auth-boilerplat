import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
    type CheckoutDetailsResult,
    type PaymentService,
    type ProcessPaymentResult,
} from './payment.service';

@Injectable()
export class InMemoryPaymentService implements PaymentService {
    process(amount: number, currency: string): Promise<ProcessPaymentResult> {
        const providerPaymentId = `in-memory-${randomUUID()}`;

        return Promise.resolve({
            providerPaymentId,
            checkoutUri: this.buildCheckoutUri(providerPaymentId),
            providerMetadata: JSON.stringify({
                mode: 'in-memory',
                amount,
                currency,
            }),
        });
    }

    getCheckoutByProviderPaymentId(
        providerPaymentId: string,
    ): Promise<CheckoutDetailsResult | null> {
        if (!providerPaymentId.trim()) {
            return Promise.resolve(null);
        }

        return Promise.resolve({
            checkoutUri: this.buildCheckoutUri(providerPaymentId),
        });
    }

    private buildCheckoutUri(providerPaymentId: string): string {
        return `https://checkout.in-memory.local/payments/${providerPaymentId}`;
    }
}
