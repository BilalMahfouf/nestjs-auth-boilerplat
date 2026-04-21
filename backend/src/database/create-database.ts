import 'dotenv/config';
import { Client } from 'pg';

const readEnv = (name: string, fallback: string): string => {
    const value = process.env[name];
    return value && value.trim().length > 0 ? value : fallback;
};

const ensureSafeDatabaseName = (value: string): string => {
    if (!/^[A-Za-z0-9_]+$/.test(value)) {
        throw new Error(
            `DATABASE_NAME contains unsupported characters: "${value}". Only letters, digits, and underscore are allowed.`,
        );
    }

    return value;
};

const bootstrap = async (): Promise<void> => {
    const host = readEnv('DATABASE_HOST', 'localhost');
    const port = Number.parseInt(readEnv('DATABASE_PORT', '5432'), 10);
    const user = readEnv('DATABASE_USERNAME', 'postgres');
    const password = readEnv('DATABASE_PASSWORD', 'postgres');
    const databaseName = ensureSafeDatabaseName(readEnv('DATABASE_NAME', 'auth'));

    const client = new Client({
        host,
        port,
        user,
        password,
        database: 'postgres',
    });

    await client.connect();

    const existsResult = await client.query<{ exists: boolean }>(
        'SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1) AS "exists"',
        [databaseName],
    );

    if (!existsResult.rows[0]?.exists) {
        await client.query(`CREATE DATABASE ${databaseName}`);
    }

    await client.end();
};

bootstrap().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
});
