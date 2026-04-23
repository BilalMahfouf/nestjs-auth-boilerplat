import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

export async function applyPendingMigrations(
  app: INestApplication,
): Promise<void> {
  if (process.env.NODE_ENV !== 'development') return;

  const dataSource = app.get(DataSource);

  const pending = await dataSource.showMigrations();
  if (!pending) {
    console.log('✅ No pending migrations.');
    return;
  }

  console.log('⏳ Applying pending migrations...');
  await dataSource.runMigrations({ transaction: 'each' });
  console.log('✅ Migrations applied successfully.');
}
