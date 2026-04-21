import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { AppModule } from '../../../src/app.module';
import { buildDataSourceOptionsFromEnv } from '../../../src/database/typeorm.config';
import { PostgresTestContainer } from './postgres-test-container';

interface DatabaseContext {
    host: string;
    port: number;
    databaseName: string;
    releaseContainer: () => Promise<void>;
}

export abstract class IntegrationTestBase {
    protected app!: INestApplication;
    protected dataSource!: DataSource;
    protected databaseName!: string;

    private databaseContext!: DatabaseContext;
    private environmentBackup: Partial<Record<string, string | undefined>> = {};

    protected async initialize(): Promise<void> {
        this.databaseContext = await this.createDatabaseContext();
        this.applyEnvironment(this.databaseContext);
        await this.createApplication();
    }

    protected async dispose(): Promise<void> {
        if (this.app) {
            await this.app.close();
        }

        if (this.dataSource?.isInitialized) {
            await this.dataSource.destroy();
        }

        await this.dropDatabase(this.databaseContext);
        await this.databaseContext.releaseContainer();
        this.restoreEnvironment();
    }

    protected async recreateDataSource(): Promise<DataSource> {
        const dataSource = new DataSource(buildDataSourceOptionsFromEnv());
        await dataSource.initialize();
        await dataSource.runMigrations();
        return dataSource;
    }

    private async createApplication(): Promise<void> {
        this.dataSource = await this.recreateDataSource();

        const testingModule: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        this.app = testingModule.createNestApplication();
        this.app.setGlobalPrefix('api/v1');
        this.app.use(cookieParser());
        this.app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                transform: true,
                forbidNonWhitelisted: false,
            }),
        );

        await this.app.init();
    }

    private async createDatabaseContext(): Promise<DatabaseContext> {
        const container = await PostgresTestContainer.acquire();
        const databaseName = `cv_builder_it_${randomUUID().replace(/-/g, '_')}`;

        await this.createDatabase({
            host: container.host,
            port: container.port,
            databaseName,
        });

        return {
            host: container.host,
            port: container.port,
            databaseName,
            releaseContainer: container.release,
        };
    }

    private applyEnvironment(context: DatabaseContext): void {
        this.environmentBackup = {
            DATABASE_HOST: process.env.DATABASE_HOST,
            DATABASE_PORT: process.env.DATABASE_PORT,
            DATABASE_USERNAME: process.env.DATABASE_USERNAME,
            DATABASE_PASSWORD: process.env.DATABASE_PASSWORD,
            DATABASE_NAME: process.env.DATABASE_NAME,
            JWT_SECRET_KEY: process.env.JWT_SECRET_KEY,
            JWT_ISSUER: process.env.JWT_ISSUER,
            JWT_AUDIENCE: process.env.JWT_AUDIENCE,
            JWT_ACCESS_TOKEN_LIFETIME_MINUTES: process.env.JWT_ACCESS_TOKEN_LIFETIME_MINUTES,
            REFRESH_TOKEN_COOKIE_NAME: process.env.REFRESH_TOKEN_COOKIE_NAME,
            REFRESH_TOKEN_DAYS: process.env.REFRESH_TOKEN_DAYS,
        };

        process.env.DATABASE_HOST = context.host;
        process.env.DATABASE_PORT = String(context.port);
        process.env.DATABASE_USERNAME = 'postgres';
        process.env.DATABASE_PASSWORD = 'postgres';
        process.env.DATABASE_NAME = context.databaseName;
        process.env.JWT_SECRET_KEY = 'test-secret-key';
        process.env.JWT_ISSUER = 'https://tests.local';
        process.env.JWT_AUDIENCE = 'https://tests.local/web';
        process.env.JWT_ACCESS_TOKEN_LIFETIME_MINUTES = '50';
        process.env.REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';
        process.env.REFRESH_TOKEN_DAYS = '7';
    }

    private restoreEnvironment(): void {
        const keys = Object.keys(this.environmentBackup) as Array<keyof typeof this.environmentBackup>;

        for (const key of keys) {
            const value = this.environmentBackup[key];
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }
    }

    private async createDatabase(params: { host: string; port: number; databaseName: string }): Promise<void> {
        const client = new Client({
            host: params.host,
            port: params.port,
            user: 'postgres',
            password: 'postgres',
            database: 'postgres',
        });

        await client.connect();
        await client.query(`DROP DATABASE IF EXISTS ${params.databaseName}`);
        await client.query(`CREATE DATABASE ${params.databaseName}`);
        await client.end();
    }

    private async dropDatabase(context: DatabaseContext): Promise<void> {
        const client = new Client({
            host: context.host,
            port: context.port,
            user: 'postgres',
            password: 'postgres',
            database: 'postgres',
        });

        await client.connect();
        await client.query(`DROP DATABASE IF EXISTS ${context.databaseName}`);
        await client.end();
    }
}
