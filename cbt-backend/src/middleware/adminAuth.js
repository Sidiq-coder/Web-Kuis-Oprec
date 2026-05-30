import { query } from '../db/pool.js';
export async function adminAuth(req, res, next) {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
    if (!token) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const sessions = await query('SELECT admin_id FROM admin_sessions WHERE token = $1 AND expires_at > NOW()', [token]);
    if (sessions.length === 0) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    req.adminId = sessions[0].admin_id;
    next();
}
