import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { Entity as DomainEntity } from '../../../common/domain/entity';
import { UserEntity } from '../../users/entities/user.entity';
import { PaymentStatus } from './payment-status.enum';

@Entity('payments')
@Index('ix_payments_user_id', ['userId'])
@Index('ix_payments_status', ['status'])
@Index('ix_payments_idempotency_key', ['idempotencyKey'], { unique: true })
export class PaymentEntity extends DomainEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'amount', type: 'numeric', precision: 18, scale: 2 })
  amount!: string;

  @Column({ name: 'currency', type: 'varchar', length: 3 })
  currency!: string;

  @Column({ name: 'status', type: 'smallint' })
  status!: PaymentStatus;

  @Column({ name: 'provider', type: 'varchar', length: 100 })
  provider!: string;

  @Column({
    name: 'provider_payment_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  providerPaymentId!: string | null;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 255 })
  idempotencyKey!: string;

  @Column({ name: 'provider_metadata', type: 'text', nullable: true })
  providerMetadata!: string | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason!: string | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  static createPending(params: {
    userId: string;
    amount: number;
    currency: string;
    provider: string;
    idempotencyKey?: string;
  }): PaymentEntity {
    if (params.amount <= 0) {
      throw new Error('Payment.InvalidAmount');
    }

    const normalizedCurrency = params.currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
      throw new Error('Payment.InvalidCurrency');
    }

    if (!params.provider.trim()) {
      throw new Error('Payment.InvalidProvider');
    }

    return Object.assign(new PaymentEntity(), {
      userId: params.userId,
      amount: params.amount.toFixed(2),
      currency: normalizedCurrency,
      status: PaymentStatus.Pending,
      provider: params.provider,
      providerPaymentId: null,
      idempotencyKey: params.idempotencyKey ?? randomUUID(),
      providerMetadata: null,
      failureReason: null,
      paidAt: null,
    });
  }

  markPaid(metadata?: string): void {
    this.status = PaymentStatus.Paid;
    this.providerMetadata = metadata ?? this.providerMetadata;
    this.paidAt = new Date();
  }

  markFailed(reason: string, metadata?: string): void {
    this.status = PaymentStatus.Failed;
    this.failureReason = reason;
    this.providerMetadata = metadata ?? this.providerMetadata;
  }

  markExpired(reason: string, metadata?: string): void {
    this.status = PaymentStatus.Expired;
    this.failureReason = reason;
    this.providerMetadata = metadata ?? this.providerMetadata;
  }

  markRefunded(): void {
    this.status = PaymentStatus.Refunded;
  }

  setProviderPaymentId(providerPaymentId: string | null): void {
    this.providerPaymentId = providerPaymentId;
  }

  setProviderMetadata(providerMetadata: string | null): void {
    this.providerMetadata = providerMetadata;
  }
}
