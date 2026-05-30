import { pool, query } from '../db/pool.js';
export async function getProjectCaseByTheme(req, res) {
    const { themeId } = req.params;
    const { participantId } = req.query;

    if (participantId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const participantResult = await client.query(`SELECT project_case
         FROM participants
         WHERE id = $1
         FOR UPDATE`, [participantId]);
            if (participantResult.rowCount === 0) {
                await client.query('ROLLBACK');
                res.status(404).json({ error: 'Participant not found' });
                return;
            }

            let projectCaseId = participantResult.rows[0]?.project_case;
            if (projectCaseId) {
                const assignedCaseResult = await client.query(`SELECT id
         FROM project_cases
         WHERE id = $1
           AND theme_id = $2`, [projectCaseId, themeId]);
                if (assignedCaseResult.rowCount === 0) {
                    projectCaseId = null;
                }
            }

            if (!projectCaseId) {
                const randomCaseResult = await client.query(`SELECT id
         FROM project_cases
         WHERE theme_id = $1
         ORDER BY random()
         LIMIT 1`, [themeId]);
                projectCaseId = randomCaseResult.rows[0]?.id;
                if (projectCaseId) {
                    await client.query(`UPDATE participants
           SET project_case = $2
           WHERE id = $1`, [participantId, projectCaseId]);
                }
            }

            if (!projectCaseId) {
                await client.query('ROLLBACK');
                res.status(404).json({ error: 'Project case not found' });
                return;
            }

            const projectCaseResult = await client.query(`SELECT pc.id,
              pc.theme_id AS "themeId",
              pc.title,
              pc.description,
              pc.requirements,
              pc.allowed_formats AS "allowedFormats",
              pc.max_size AS "maxSize",
              pt.duration_minutes AS "durationMinutes"
       FROM project_cases pc
       JOIN project_themes pt ON pt.id = pc.theme_id
       WHERE pc.id = $1`, [projectCaseId]);
            await client.query('COMMIT');
            res.json(projectCaseResult.rows[0]);
            return;
        }
        catch (error) {
            await client.query('ROLLBACK').catch(() => { });
            throw error;
        }
        finally {
            client.release();
        }
    }

    const [projectCase] = await query(`SELECT pc.id,
            pc.theme_id AS "themeId",
            pc.title,
            pc.description,
            pc.requirements,
            pc.allowed_formats AS "allowedFormats",
            pc.max_size AS "maxSize",
            pt.duration_minutes AS "durationMinutes"
     FROM project_cases pc
     JOIN project_themes pt ON pt.id = pc.theme_id
     WHERE pc.theme_id = $1
     ORDER BY random()
     LIMIT 1`, [themeId]);
    if (!projectCase) {
        res.status(404).json({ error: 'Project case not found' });
        return;
    }
    res.json(projectCase);
}
export async function listProjectCases(req, res) {
    const { themeId } = req.query;
    const cases = await query(`SELECT id, theme_id AS "themeId", title, description, requirements, allowed_formats AS "allowedFormats", max_size AS "maxSize"
     FROM project_cases
     ${themeId ? 'WHERE theme_id = $1' : ''}
     ORDER BY theme_id ASC`, themeId ? [themeId] : []);
    res.json(cases);
}
export async function createProjectCase(req, res) {
    const { themeId, title, description, requirements, allowedFormats, maxSize } = req.body;
    if (!themeId || !title || !description || !requirements || !allowedFormats || !maxSize) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }
    const id = `proj-${Date.now()}`;
    const [created] = await query(`INSERT INTO project_cases (id, theme_id, title, description, requirements, allowed_formats, max_size)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, theme_id AS "themeId", title, description, requirements, allowed_formats AS "allowedFormats", max_size AS "maxSize"`, [
        id,
        themeId,
        title,
        description,
        JSON.stringify(requirements),
        JSON.stringify(allowedFormats),
        maxSize,
    ]);
    res.status(201).json(created);
}
export async function updateProjectCase(req, res) {
    const { projectCaseId } = req.params;
    const { themeId, title, description, requirements, allowedFormats, maxSize } = req.body;
    const [updated] = await query(`UPDATE project_cases
     SET theme_id = COALESCE($2, theme_id),
         title = COALESCE($3, title),
         description = COALESCE($4, description),
         requirements = COALESCE($5, requirements),
         allowed_formats = COALESCE($6, allowed_formats),
         max_size = COALESCE($7, max_size)
     WHERE id = $1
     RETURNING id, theme_id AS "themeId", title, description, requirements, allowed_formats AS "allowedFormats", max_size AS "maxSize"`, [
        projectCaseId,
        themeId ?? null,
        title ?? null,
        description ?? null,
        requirements ? JSON.stringify(requirements) : null,
        allowedFormats ? JSON.stringify(allowedFormats) : null,
        maxSize ?? null,
    ]);
    if (!updated) {
        res.status(404).json({ error: 'Project case not found' });
        return;
    }
    res.json(updated);
}
export async function deleteProjectCase(req, res) {
    const { projectCaseId } = req.params;
    const deleted = await query('DELETE FROM project_cases WHERE id = $1 RETURNING id', [projectCaseId]);
    if (deleted.length === 0) {
        res.status(404).json({ error: 'Project case not found' });
        return;
    }
    res.json({ success: true });
}
