import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { UserEntity } from '../modules/users/entities/user.entity';
import { UserSessionEntity } from '../modules/users/entities/user-session.entity';

const parsePort = (value: string | undefined, fallback: number): number => {
    if (!value) {
        return fallback;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};

export const buildTypeOrmOptions = (
    configService: ConfigService,
): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: configService.get<string>('DATABASE_HOST', 'localhost'),
    port: parsePort(configService.get<string>('DATABASE_PORT'), 5432),
    username: configService.get<string>('DATABASE_USERNAME', 'postgres'),
    password: configService.get<string>('DATABASE_PASSWORD', 'postgres'),
    database: configService.get<string>('DATABASE_NAME', 'auth'),
    entities: [UserEntity, UserSessionEntity],
    migrations: ['dist/database/migrations/*.js'],
    migrationsRun: false,
    synchronize: false,
    logging: false,
});

export const buildDataSourceOptionsFromEnv = (): DataSourceOptions => ({
    type: 'postgres',
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: parsePort(process.env.DATABASE_PORT, 5432),
    username: process.env.DATABASE_USERNAME ?? 'postgres',
    password: process.env.DATABASE_PASSWORD ?? 'postgres',
    database: process.env.DATABASE_NAME ?? 'auth',
    entities: [UserEntity, UserSessionEntity],
    migrations: ['src/database/migrations/*.ts'],
    synchronize: false,
    logging: false,
});
