import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';

const POSTGRES_IMAGE = 'postgres:16-alpine';
const POSTGRES_USER = 'postgres';
const POSTGRES_PASSWORD = 'postgres';
const POSTGRES_PORT = 5432;

interface ContainerState {
    containerId: string;
    host: string;
    port: number;
    referenceCount: number;
}

const sleep = (milliseconds: number): Promise<void> =>
    new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });

const waitForPostgres = async (host: string, port: number): Promise<void> => {
    const deadline = Date.now() + 60_000;

    while (Date.now() < deadline) {
        const client = new Client({
            host,
            port,
            user: POSTGRES_USER,
            password: POSTGRES_PASSWORD,
            database: 'postgres',
        });

        try {
            await client.connect();
            await client.query('SELECT 1');
            await client.end();
            return;
        } catch {
            await client.end().catch(() => undefined);
            await sleep(500);
        }
    }

    throw new Error('Postgres container did not become ready in time');
};

const parseDockerPort = (output: string): { host: string; port: number } => {
    const trimmed = output.trim();
    const match = trimmed.match(/^(.*):(\d+)$/);

    if (!match) {
        throw new Error(`Unexpected docker port output: ${output}`);
    }

    return {
        host: match[1],
        port: Number.parseInt(match[2], 10),
    };
};

export class PostgresTestContainer {
    private static state: ContainerState | null = null;

    static async acquire(): Promise<{
        host: string;
        port: number;
        release: () => Promise<void>;
    }> {
        if (!this.state) {
            const containerName = `cv-builder-it-${randomUUID().replace(/-/g, '')}`;
            const containerId = execFileSync('docker', [
                'run',
                '-d',
                '--rm',
                '--name',
                containerName,
                '-e',
                `POSTGRES_USER=${POSTGRES_USER}`,
                '-e',
                `POSTGRES_PASSWORD=${POSTGRES_PASSWORD}`,
                '-e',
                'POSTGRES_DB=postgres',
                '-p',
                '127.0.0.1::5432',
                POSTGRES_IMAGE,
            ], { encoding: 'utf8' }).trim();

            const portMapping = execFileSync('docker', ['port', containerId, '5432/tcp'], {
                encoding: 'utf8',
            });
            const { host, port } = parseDockerPort(portMapping);

            await waitForPostgres(host, port);

            this.state = {
                containerId,
                host,
                port,
                referenceCount: 0,
            };
        }

        this.state.referenceCount += 1;

        return {
            host: this.state.host,
            port: this.state.port,
            release: async () => {
                if (!this.state) {
                    return;
                }

                this.state.referenceCount -= 1;

                if (this.state.referenceCount <= 0) {
                    execFileSync('docker', ['rm', '-f', this.state.containerId], { stdio: 'ignore' });
                    this.state = null;
                }
            },
        };
    }
}
