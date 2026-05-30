import { pool, query } from '../db/pool.js';
export async function listThemes(_req, res) {
    const themes = await query('SELECT id, name, description, icon, is_active AS "isActive", duration_minutes AS "durationMinutes" FROM themes WHERE is_active = TRUE ORDER BY name ASC');
    res.json(themes);
}
export async function listAdminThemes(_req, res) {
    const themes = await query('SELECT id, name, description, icon, is_active AS "isActive", duration_minutes AS "durationMinutes" FROM themes ORDER BY name ASC');
    res.json(themes);
}
export async function listProjectThemes(_req, res) {
    const themes = await query('SELECT id, name, description, icon, is_active AS "isActive", duration_minutes AS "durationMinutes" FROM project_themes WHERE is_active = TRUE ORDER BY name ASC');
    res.json(themes);
}
export async function listAdminProjectThemes(_req, res) {
    const themes = await query('SELECT id, name, description, icon, is_active AS "isActive", duration_minutes AS "durationMinutes" FROM project_themes ORDER BY name ASC');
    res.json(themes);
}
export async function createTheme(req, res) {
    const { name, description, icon, id, isActive, durationMinutes } = req.body;
    if (!name || !description) {
        res.status(400).json({ error: 'Name and description are required' });
        return;
    }
    const themeId = id || `theme-${Date.now()}`;
    const [created] = await query(`INSERT INTO themes (id, name, description, icon, is_active, duration_minutes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, description, icon, is_active AS "isActive", duration_minutes AS "durationMinutes"`, [themeId, name, description, icon || '', isActive ?? true, Number(durationMinutes || 60)]);
    res.status(201).json(created);
}
export async function createProjectTheme(req, res) {
    const { name, description, icon, id, isActive, durationMinutes } = req.body;
    if (!name || !description) {
        res.status(400).json({ error: 'Name and description are required' });
        return;
    }
    const themeId = id || `project-theme-${Date.now()}`;
    const [created] = await query(`INSERT INTO project_themes (id, name, description, icon, is_active, duration_minutes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, description, icon, is_active AS "isActive", duration_minutes AS "durationMinutes"`, [themeId, name, description, icon || '', isActive ?? true, Number(durationMinutes || 120)]);
    res.status(201).json(created);
}
export async function updateTheme(req, res) {
    const { themeId } = req.params;
    const { name, description, icon, isActive, durationMinutes } = req.body;
    const [updated] = await query(`UPDATE themes
     SET name = COALESCE($2, name),
         description = COALESCE($3, description),
         icon = COALESCE($4, icon),
         is_active = COALESCE($5, is_active),
         duration_minutes = COALESCE($6, duration_minutes)
     WHERE id = $1
     RETURNING id, name, description, icon, is_active AS "isActive", duration_minutes AS "durationMinutes"`, [themeId, name ?? null, description ?? null, icon ?? null, isActive ?? null, durationMinutes ?? null]);
    if (!updated) {
        res.status(404).json({ error: 'Theme not found' });
        return;
    }
    res.json(updated);
}
export async function updateProjectTheme(req, res) {
    const { themeId } = req.params;
    const { name, description, icon, isActive, durationMinutes } = req.body;
    const [updated] = await query(`UPDATE project_themes
     SET name = COALESCE($2, name),
         description = COALESCE($3, description),
         icon = COALESCE($4, icon),
         is_active = COALESCE($5, is_active),
         duration_minutes = COALESCE($6, duration_minutes)
     WHERE id = $1
     RETURNING id, name, description, icon, is_active AS "isActive", duration_minutes AS "durationMinutes"`, [themeId, name ?? null, description ?? null, icon ?? null, isActive ?? null, durationMinutes ?? null]);
    if (!updated) {
        res.status(404).json({ error: 'Project theme not found' });
        return;
    }
    res.json(updated);
}
export async function deleteTheme(req, res) {
    const { themeId } = req.params;
    const forceDelete = ['1', 'true', 'yes'].includes(String(req.query.force || '').toLowerCase());
    const [usage] = await query(`SELECT
        (SELECT COUNT(*)::int FROM participants WHERE exam_theme = $1) AS participant_count,
        0::int AS submission_count`, [themeId]);

    if (!forceDelete && ((usage?.participant_count || 0) > 0 || (usage?.submission_count || 0) > 0)) {
        res.status(409).json({
            error: 'Theme is still used by participants or submissions and cannot be deleted.',
            participantCount: usage?.participant_count || 0,
            submissionCount: usage?.submission_count || 0,
        });
        return;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        if (forceDelete) {
            await client.query('UPDATE participants SET exam_theme = NULL WHERE exam_theme = $1', [themeId]);
        }

        const deleted = await client.query('DELETE FROM themes WHERE id = $1 RETURNING id', [themeId]);
        if (deleted.rowCount === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ error: 'Theme not found' });
            return;
        }

        await client.query('COMMIT');
        res.json({ success: true, forceDeleted: forceDelete });
    }
    catch (error) {
        await client.query('ROLLBACK').catch(() => { });
        throw error;
    }
    finally {
        client.release();
    }
}
export async function deleteProjectTheme(req, res) {
    const { themeId } = req.params;
    const forceDelete = ['1', 'true', 'yes'].includes(String(req.query.force || '').toLowerCase());
    const [usage] = await query(`SELECT
        (SELECT COUNT(*)::int FROM participants WHERE project_theme = $1) AS participant_count,
        (SELECT COUNT(*)::int FROM project_submissions WHERE theme_id = $1) AS submission_count`, [themeId]);

    if (!forceDelete && ((usage?.participant_count || 0) > 0 || (usage?.submission_count || 0) > 0)) {
        res.status(409).json({
            error: 'Project theme is still used by participants or submissions and cannot be deleted.',
            participantCount: usage?.participant_count || 0,
            submissionCount: usage?.submission_count || 0,
        });
        return;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        if (forceDelete) {
            await client.query('UPDATE participants SET project_theme = NULL WHERE project_theme = $1', [themeId]);
        }

        const deleted = await client.query('DELETE FROM project_themes WHERE id = $1 RETURNING id', [themeId]);
        if (deleted.rowCount === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ error: 'Project theme not found' });
            return;
        }

        await client.query('COMMIT');
        res.json({ success: true, forceDeleted: forceDelete });
    }
    catch (error) {
        await client.query('ROLLBACK').catch(() => { });
        throw error;
    }
    finally {
        client.release();
    }
}
