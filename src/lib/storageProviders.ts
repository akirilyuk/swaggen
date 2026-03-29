/**
 * Generates data-storage boilerplate configuration and code snippets
 * for each supported provider.
 */
import type { DataStorageProvider } from '@/types/project';

interface StorageProviderInfo {
  label: string;
  description: string;
  defaultConnectionString: string;
  envVarName: string;
  npmPackage: string;
  /** Sample client initialisation code */
  sampleCode: string;
}

export const STORAGE_PROVIDERS: Record<
  DataStorageProvider,
  StorageProviderInfo
> = {
  supabase: {
    label: 'Supabase',
    description: 'Postgres-backed BaaS with real-time, auth and storage',
    defaultConnectionString: 'https://your-project.supabase.co',
    envVarName: 'SUPABASE_URL',
    npmPackage: '@supabase/supabase-js',
    sampleCode: `import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
);

export default supabase;`,
  },
  mongodb: {
    label: 'MongoDB',
    description: 'Document database for flexible, JSON-like data',
    defaultConnectionString: 'mongodb://localhost:27017/mydb',
    envVarName: 'MONGODB_URI',
    npmPackage: 'mongodb',
    sampleCode: `import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI!);
const db = client.db();

export default db;`,
  },
  mysql: {
    label: 'MySQL',
    description: 'Popular open-source relational database',
    defaultConnectionString: 'mysql://root:password@localhost:3306/mydb',
    envVarName: 'MYSQL_URL',
    npmPackage: 'mysql2',
    sampleCode: `import mysql from 'mysql2/promise';

const pool = mysql.createPool(process.env.MYSQL_URL!);

export default pool;`,
  },
  postgres: {
    label: 'PostgreSQL',
    description: 'Advanced open-source relational database',
    defaultConnectionString: 'postgresql://user:password@localhost:5432/mydb',
    envVarName: 'POSTGRES_URL',
    npmPackage: 'pg',
    sampleCode: `import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL!,
});

export default pool;`,
  },
  redis: {
    label: 'Redis',
    description: 'In-memory key-value store for caching and queues',
    defaultConnectionString: 'redis://localhost:6379',
    envVarName: 'REDIS_URL',
    npmPackage: 'ioredis',
    sampleCode: `import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

export default redis;`,
  },
  sqlite: {
    label: 'SQLite',
    description: 'Lightweight embedded relational database',
    defaultConnectionString: './data/local.db',
    envVarName: 'SQLITE_PATH',
    npmPackage: 'better-sqlite3',
    sampleCode: `import Database from 'better-sqlite3';

const db = new Database(process.env.SQLITE_PATH || './data/local.db');

export default db;`,
  },
};

export const PROVIDER_LIST = Object.entries(STORAGE_PROVIDERS).map(
  ([key, info]) => ({ value: key as DataStorageProvider, ...info }),
);
