import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildDataSourceOptionsFromEnv } from './typeorm.config';

export default new DataSource(buildDataSourceOptionsFromEnv());
