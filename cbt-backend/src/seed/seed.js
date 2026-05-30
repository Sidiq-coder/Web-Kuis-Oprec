import bcrypt from 'bcrypt';
import { pool } from '../db/pool.js';
async function upsertSetting(key, value) {
    await pool.query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', [key, value]);
}
const examDuration = 60;
const projectDuration = 120;
async function upsertAdmin(username, password) {
    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(`INSERT INTO admins (username, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`, [username, passwordHash]);
}
async function seedAdmin() {
    const primaryUsername = process.env.ADMIN_DEFAULT_USERNAME || 'admin';
    const primaryPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
    await upsertAdmin(primaryUsername, primaryPassword);
    const secondaryUsername = process.env.ADMIN_SECONDARY_USERNAME;
    const secondaryPassword = process.env.ADMIN_SECONDARY_PASSWORD;
    if (secondaryUsername && secondaryPassword && secondaryUsername !== primaryUsername) {
        await upsertAdmin(secondaryUsername, secondaryPassword);
    }
}
async function seed() {
    await upsertSetting('examDuration', String(examDuration));
    await upsertSetting('projectDuration', String(projectDuration));
    await upsertSetting('sessionResetVersion', '0');
    await seedAdmin();
    console.log('Seed complete');
    await pool.end();
}
seed().catch((error) => {
    console.error(error);
    process.exit(1);
});
