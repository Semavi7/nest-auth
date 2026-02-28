import { DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

config(); 

export const typeOrmConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [path.join(__dirname, '../../**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, '../../migrations/*{.ts,.js}')],
  synchronize: false,
};