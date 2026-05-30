import { query } from '../db/pool.js';
export async function getConfig(_req, res) {
    const settings = await query('SELECT key, value FROM settings');
    const map = settings.reduce((acc, item) => {
        acc[item.key] = item.value;
        return acc;
    }, {});
    res.json({
        examDuration: Number(map.examDuration || 60),
        projectDuration: Number(map.projectDuration || 120),
        waitingRoomEnabled: ['1', 'true', 'yes'].includes(String(map.waitingRoomEnabled || '').toLowerCase()),
        sessionResetVersion: map.sessionResetVersion || '0',
    });
}
