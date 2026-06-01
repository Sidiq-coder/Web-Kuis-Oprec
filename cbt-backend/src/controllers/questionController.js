import { query } from '../db/pool.js';
function normalizeCorrectAnswers(correctAnswers) {
    return [...new Set(Array.isArray(correctAnswers) ? correctAnswers.map(Number).filter(Number.isInteger) : [])].sort((a, b) => a - b);
}
function parseJsonField(value) {
    if (typeof value !== 'string')
        return value;
    try {
        return JSON.parse(value);
    }
    catch {
        return value;
    }
}
function isTrue(value) {
    return value === true || value === 'true';
}
export async function listQuestionsByTheme(req, res) {
    const { themeId } = req.params;
    const { participantId } = req.query;
    const [theme] = await query('SELECT randomize_items, item_limit FROM themes WHERE id = $1', [themeId]);
    const shouldRandomize = theme?.randomize_items !== false;
    const itemLimit = Math.max(Number(theme?.item_limit || 0), 0);
    const questions = await query(`SELECT id, theme_id AS "themeId", type, question, options, correct_answer AS "correctAnswer", correct_answers AS "correctAnswers", weight,
            attachment_name AS "attachmentName", attachment_path AS "attachmentUrl", attachment_mime_type AS "attachmentMimeType"
     FROM questions
     WHERE theme_id = $1
     ORDER BY ${participantId && shouldRandomize ? 'md5(id || $2)' : 'id ASC'}
     ${itemLimit > 0 ? `LIMIT ${itemLimit}` : ''}`, participantId && shouldRandomize ? [themeId, participantId] : [themeId]);
    res.json(questions);
}
export async function createQuestion(req, res) {
    const { themeId, type, question, correctAnswer, weight } = req.body;
    const options = parseJsonField(req.body.options);
    const correctAnswers = parseJsonField(req.body.correctAnswers);
    if (!themeId || !type || !question || !weight) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }
    const normalizedCorrectAnswers = normalizeCorrectAnswers(correctAnswers);
    if (type === 'multiple-answer' && normalizedCorrectAnswers.length < 2) {
        res.status(400).json({ error: 'Multiple-answer questions require at least two correct answers' });
        return;
    }
    const id = `q-${Date.now()}`;
    const [created] = await query(`INSERT INTO questions (id, theme_id, type, question, options, correct_answer, correct_answers, weight, attachment_name, attachment_path, attachment_mime_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id, theme_id AS "themeId", type, question, options, correct_answer AS "correctAnswer", correct_answers AS "correctAnswers", weight,
       attachment_name AS "attachmentName", attachment_path AS "attachmentUrl", attachment_mime_type AS "attachmentMimeType"`, [id, themeId, type, question, options ? JSON.stringify(options) : null, type === 'multiple-choice' ? correctAnswer ?? null : null, type === 'multiple-answer' ? JSON.stringify(normalizedCorrectAnswers) : null, weight, req.file?.originalname ?? null, req.file ? `/uploads/${req.file.filename}` : null, req.file?.mimetype ?? null]);
    res.status(201).json(created);
}
export async function updateQuestion(req, res) {
    const { questionId } = req.params;
    const { themeId, type, question, correctAnswer, weight } = req.body;
    const options = parseJsonField(req.body.options);
    const correctAnswers = parseJsonField(req.body.correctAnswers);
    const normalizedCorrectAnswers = correctAnswers === undefined ? null : normalizeCorrectAnswers(correctAnswers);
    if (type === 'multiple-answer' && normalizedCorrectAnswers?.length < 2) {
        res.status(400).json({ error: 'Multiple-answer questions require at least two correct answers' });
        return;
    }
    const [updated] = await query(`UPDATE questions
     SET theme_id = COALESCE($2, theme_id),
         type = COALESCE($3, type),
         question = COALESCE($4, question),
         options = COALESCE($5, options),
         correct_answer = COALESCE($6, correct_answer),
         correct_answers = COALESCE($7, correct_answers),
         weight = COALESCE($8, weight),
         attachment_name = CASE WHEN $12 THEN NULL ELSE COALESCE($9, attachment_name) END,
         attachment_path = CASE WHEN $12 THEN NULL ELSE COALESCE($10, attachment_path) END,
         attachment_mime_type = CASE WHEN $12 THEN NULL ELSE COALESCE($11, attachment_mime_type) END
     WHERE id = $1
     RETURNING id, theme_id AS "themeId", type, question, options, correct_answer AS "correctAnswer", correct_answers AS "correctAnswers", weight,
       attachment_name AS "attachmentName", attachment_path AS "attachmentUrl", attachment_mime_type AS "attachmentMimeType"`, [
        questionId,
        themeId ?? null,
        type ?? null,
        question ?? null,
        options ? JSON.stringify(options) : null,
        correctAnswer ?? null,
        normalizedCorrectAnswers ? JSON.stringify(normalizedCorrectAnswers) : null,
        weight ?? null,
        req.file?.originalname ?? null,
        req.file ? `/uploads/${req.file.filename}` : null,
        req.file?.mimetype ?? null,
        isTrue(req.body.removeAttachment),
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
