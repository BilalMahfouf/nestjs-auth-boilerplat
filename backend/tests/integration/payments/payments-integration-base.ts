import { Repository } from 'typeorm';
import { PaymentEntity } from '../../../src/modules/payments/entities/payment.entity';
import { UsersIntegrationBase } from '../users/users-integration-base';

export abstract class PaymentsIntegrationBase extends UsersIntegrationBase {
  protected get paymentsRepository(): Repository<PaymentEntity> {
    return this.dataSource.getRepository(PaymentEntity);
  }

  protected override async resetDatabase(): Promise<void> {
    await this.dataSource.query(
      'TRUNCATE TABLE payments, user_sessions, users RESTART IDENTITY CASCADE',
    );
  }
}
