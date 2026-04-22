export interface ProcessPaymentResult {
  providerPaymentId: string;
  providerMetadata?: string;
}

export abstract class PaymentService {
  abstract process(
    amount: number,
    currency: string,
  ): Promise<ProcessPaymentResult>;
}
