import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './pool.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export async function runMigration() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = await fs.readFile(schemaPath, 'utf8');
    await pool.query(sql);
    console.log('Migration complete');
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    runMigration()
        .then(() => pool.end())
        .catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
