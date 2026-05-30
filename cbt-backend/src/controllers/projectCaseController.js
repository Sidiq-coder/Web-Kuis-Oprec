import { query } from '../db/pool.js';
export async function getProjectCaseByTheme(req, res) {
    const { themeId } = req.params;
    const { participantId } = req.query;
    const [themeConfig] = await query('SELECT randomize_items, item_limit FROM project_themes WHERE id = $1', [themeId]);
    const shouldRandomize = themeConfig?.randomize_items !== false;
    const itemLimit = Math.max(Number(themeConfig?.item_limit || 1), 1);
    const caseOrder = shouldRandomize && participantId ? 'md5(id || $2)' : shouldRandomize ? 'random()' : 'id ASC';
    const buildProjectAssignment = (rows) => {
        const cases = rows.map((row) => ({
            id: row.id,
            themeId: row.themeId,
            title: row.title,
            description: row.description,
            requirements: row.requirements,
            allowedFormats: row.allowedFormats,
            maxSize: row.maxSize,
        }));
        const firstCase = cases[0];
        return {
            ...firstCase,
            title: cases.length > 1 ? `${cases.length} Project Assignments` : firstCase.title,
            description: firstCase.description,
            requirements: firstCase.requirements,
            allowedFormats: firstCase.allowedFormats,
            maxSize: firstCase.maxSize,
            durationMinutes: rows[0]?.durationMinutes,
            cases,
        };
    };

    if (participantId) {
        const projectCases = await query(`SELECT pc.id,
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
       ORDER BY ${caseOrder}
       LIMIT ${itemLimit}`, shouldRandomize ? [themeId, participantId] : [themeId]);
        if (projectCases.length === 0) {
            res.status(404).json({ error: 'Project case not found' });
            return;
        }
        res.json(buildProjectAssignment(projectCases));
        return;
    }

    const projectCases = await query(`SELECT pc.id,
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
     ORDER BY ${caseOrder}
     LIMIT ${itemLimit}`, [themeId]);
    if (projectCases.length === 0) {
        res.status(404).json({ error: 'Project case not found' });
        return;
    }
    res.json(buildProjectAssignment(projectCases));
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
