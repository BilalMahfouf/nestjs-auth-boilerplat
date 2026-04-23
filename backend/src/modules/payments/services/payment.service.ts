export interface ProcessPaymentResult {
    providerPaymentId: string;
    providerMetadata?: string;
    checkoutUri?: string;
}

export interface CheckoutDetailsResult {
    checkoutUri: string;
    providerMetadata?: string;
}

export interface PaymentService {
    process(
        amount: number,
        currency: string,
    ): Promise<ProcessPaymentResult>;

    getCheckoutByProviderPaymentId(
        providerPaymentId: string,
    ): Promise<CheckoutDetailsResult | null>;
}

export const PAYMENT_SERVICE = Symbol('PAYMENT_SERVICE');
