// 一次性脚本：跑 supabase/migrations/0001_init.sql
// 用法：
//   1) 在 Supabase Dashboard → Project Settings → Database → Connection string 拿 "Direct connection" 串
//   2) 把整条 URL 贴到 .env.local 的 SUPABASE_DB_URL
//   3) `npm run migrate`
//
// 注：URL 包含数据库密码，**不要**提交到 git。.env.local 已被 .gitignore 兜住。

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Client } from 'pg';

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error('✗ SUPABASE_DB_URL 没设。请在 .env.local 里贴 Supabase "Direct connection" 串。');
  process.exit(1);
}

const file = resolve(process.cwd(), 'supabase/migrations/0001_init.sql');
const sql = await readFile(file, 'utf8');

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  console.log('→ running 0001_init.sql ...');
  await client.query(sql);
  console.log('✓ migration done');
} catch (err) {
  console.error('✗ migration failed:');
  console.error(err);
  process.exitCode = 1;
} finally {
  await client.end();
}
