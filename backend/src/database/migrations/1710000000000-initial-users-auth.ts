import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class InitialUsersAuth1710000000000 implements MigrationInterface {
  name = 'InitialUsersAuth1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'first_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'last_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '256',
            isNullable: false,
          },
          {
            name: 'password_hash',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'role',
            type: 'varchar',
            length: '50',
            default: "'Doctor'",
            isNullable: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
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

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'ix_users_email',
        columnNames: ['email'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'ix_users_user_name',
        columnNames: ['user_name'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'user_sessions',
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
            name: 'token',
            type: 'varchar',
            length: '1000',
            isNullable: false,
          },
          {
            name: 'token_type',
            type: 'smallint',
            isNullable: false,
          },
          {
            name: 'expires_at',
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
      'user_sessions',
      new TableForeignKey({
        name: 'fk_user_sessions_users_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'user_sessions',
      new TableIndex({
        name: 'ix_user_sessions_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'user_sessions',
      new TableIndex({
        name: 'ix_user_sessions_token',
        columnNames: ['token'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('user_sessions', 'ix_user_sessions_token');
    await queryRunner.dropIndex('user_sessions', 'ix_user_sessions_user_id');
    await queryRunner.dropForeignKey(
      'user_sessions',
      'fk_user_sessions_users_user_id',
    );
    await queryRunner.dropTable('user_sessions');

    await queryRunner.dropIndex('users', 'ix_users_user_name');
    await queryRunner.dropIndex('users', 'ix_users_email');
    await queryRunner.dropTable('users');
  }
}
