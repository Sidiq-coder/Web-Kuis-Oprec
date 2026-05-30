import { query } from '../db/pool.js';
export async function listQuestionsByTheme(req, res) {
    const { themeId } = req.params;
    const { participantId } = req.query;
    const [theme] = await query('SELECT randomize_items, item_limit FROM themes WHERE id = $1', [themeId]);
    const shouldRandomize = theme?.randomize_items !== false;
    const itemLimit = Math.max(Number(theme?.item_limit || 0), 0);
    const questions = await query(`SELECT id, theme_id AS "themeId", type, question, options, correct_answer AS "correctAnswer", weight
     FROM questions
     WHERE theme_id = $1
     ORDER BY ${participantId && shouldRandomize ? 'md5(id || $2)' : 'id ASC'}
     ${itemLimit > 0 ? `LIMIT ${itemLimit}` : ''}`, participantId && shouldRandomize ? [themeId, participantId] : [themeId]);
    res.json(questions);
}
export async function createQuestion(req, res) {
    const { themeId, type, question, options, correctAnswer, weight } = req.body;
    if (!themeId || !type || !question || !weight) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }
    const id = `q-${Date.now()}`;
    const [created] = await query(`INSERT INTO questions (id, theme_id, type, question, options, correct_answer, weight)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, theme_id AS "themeId", type, question, options, correct_answer AS "correctAnswer", weight`, [id, themeId, type, question, options ? JSON.stringify(options) : null, correctAnswer ?? null, weight]);
    res.status(201).json(created);
}
export async function updateQuestion(req, res) {
    const { questionId } = req.params;
    const { themeId, type, question, options, correctAnswer, weight } = req.body;
    const [updated] = await query(`UPDATE questions
     SET theme_id = COALESCE($2, theme_id),
         type = COALESCE($3, type),
         question = COALESCE($4, question),
         options = COALESCE($5, options),
         correct_answer = COALESCE($6, correct_answer),
         weight = COALESCE($7, weight)
     WHERE id = $1
     RETURNING id, theme_id AS "themeId", type, question, options, correct_answer AS "correctAnswer", weight`, [
        questionId,
        themeId ?? null,
        type ?? null,
        question ?? null,
        options ? JSON.stringify(options) : null,
        correctAnswer ?? null,
        weight ?? null,
    ]);
    if (!updated) {
        res.status(404).json({ error: 'Question not found' });
        return;
    }
    res.json(updated);
}
export async function deleteQuestion(req, res) {
    const { questionId } = req.params;
    const deleted = await query('DELETE FROM questions WHERE id = $1 RETURNING id', [questionId]);
    if (deleted.length === 0) {
        res.status(404).json({ error: 'Question not found' });
        return;
    }
    res.json({ success: true });
}
