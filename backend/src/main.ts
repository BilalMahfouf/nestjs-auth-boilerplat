import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { setupSwagger } from './common/swagger/swagger.setup';
import { applyPendingMigrations } from './database/migrations.bootstrap';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? 3000);
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  setupSwagger(app);

  await applyPendingMigrations(app);

  await app.listen(port);

  const apiUrl = await app.getUrl();
  console.log(`API running on: ${apiUrl} (port ${port})`);
  console.log(`Swagger docs: ${apiUrl}/api/docs`);
}
bootstrap();
