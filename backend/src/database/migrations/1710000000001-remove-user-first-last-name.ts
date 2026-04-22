import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemoveUserFirstLastName1710000000001 implements MigrationInterface {
  name = 'RemoveUserFirstLastName1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasFirstName = await queryRunner.hasColumn('users', 'first_name');
    if (hasFirstName) {
      await queryRunner.dropColumn('users', 'first_name');
    }

    const hasLastName = await queryRunner.hasColumn('users', 'last_name');
    if (hasLastName) {
      await queryRunner.dropColumn('users', 'last_name');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasFirstName = await queryRunner.hasColumn('users', 'first_name');
    if (!hasFirstName) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'first_name',
          type: 'varchar',
          length: '100',
          isNullable: false,
          default: "''",
        }),
      );
    }

    const hasLastName = await queryRunner.hasColumn('users', 'last_name');
    if (!hasLastName) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'last_name',
          type: 'varchar',
          length: '100',
          isNullable: false,
          default: "''",
        }),
      );
    }
  }
}
