import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreatePayments1710000000002 implements MigrationInterface {
  name = 'CreatePayments1710000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'payments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'amount',
            type: 'numeric',
            precision: 18,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'smallint',
            isNullable: false,
            default: 1,
          },
          {
            name: 'provider',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'provider_payment_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'idempotency_key',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'provider_metadata',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'failure_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'paid_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'created_on_utc',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'payments',
      new TableForeignKey({
        name: 'fk_payments_users_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'ix_payments_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'ix_payments_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'ix_payments_idempotency_key',
        columnNames: ['idempotency_key'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('payments', 'ix_payments_idempotency_key');
    await queryRunner.dropIndex('payments', 'ix_payments_status');
    await queryRunner.dropIndex('payments', 'ix_payments_user_id');
    await queryRunner.dropForeignKey('payments', 'fk_payments_users_user_id');
    await queryRunner.dropTable('payments');
  }
}
