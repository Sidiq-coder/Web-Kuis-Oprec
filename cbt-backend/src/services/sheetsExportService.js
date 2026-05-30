import { google } from 'googleapis';
import { query } from '../db/pool.js';

let sheetsClientPromise = null;
let syncTimer = null;
let syncPromise = null;

const SHEET_TITLES = ['Participants', 'Answers', 'Projects'];

function normalizeEnvValue(value) {
    return String(value || '')
        .trim()
        .replace(/^"([\s\S]*)"$/, '$1')
        .replace(/^'([\s\S]*)$/, '$1');
}

function isEnabled() {
    return ['1', 'true', 'yes'].includes(String(process.env.GOOGLE_SHEETS_ENABLED || '').toLowerCase());
}

function getSpreadsheetId() {
    return normalizeEnvValue(process.env.GOOGLE_SHEETS_SPREADSHEET_ID);
}

async function getSheetsClient() {
    if (!isEnabled()) {
        return null;
    }
    const spreadsheetId = getSpreadsheetId();
    if (!spreadsheetId) {
        console.warn('[Sheets] Export enabled but GOOGLE_SHEETS_SPREADSHEET_ID is missing.');
        return null;
    }
    if (!sheetsClientPromise) {
        sheetsClientPromise = (async () => {
            try {
                const oauthClientId = normalizeEnvValue(process.env.GOOGLE_OAUTH_CLIENT_ID);
                const oauthClientSecret = normalizeEnvValue(process.env.GOOGLE_OAUTH_CLIENT_SECRET);
                const oauthRefreshToken = normalizeEnvValue(process.env.GOOGLE_OAUTH_REFRESH_TOKEN);
                const oauthRedirectUri = normalizeEnvValue(process.env.GOOGLE_OAUTH_REDIRECT_URI);

                if (oauthClientId && oauthClientSecret && oauthRefreshToken) {
                    const oauth2Client = new google.auth.OAuth2(oauthClientId, oauthClientSecret, oauthRedirectUri || 'urn:ietf:wg:oauth:2.0:oob');
                    oauth2Client.setCredentials({ refresh_token: oauthRefreshToken });
                    await oauth2Client.getAccessToken();
                    return google.sheets({ version: 'v4', auth: oauth2Client });
                }

                const clientEmail = normalizeEnvValue(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
                const keyFile = normalizeEnvValue(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS);
                const privateKey = normalizeEnvValue(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY).replace(/\\n/g, '\n');
                if (!clientEmail || (!keyFile && !privateKey)) {
                    throw new Error('No usable Google Sheets credentials found.');
                }
                const auth = new google.auth.JWT({
                    email: clientEmail,
                    key: privateKey || undefined,
                    keyFile: keyFile || undefined,
                    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
                });
                await auth.authorize();
                return google.sheets({ version: 'v4', auth });
            }
            catch (error) {
                sheetsClientPromise = null;
                console.warn(`[Sheets] Authorization failed: ${error?.message || 'Unknown error'}`);
                return null;
            }
        })();
    }
    return sheetsClientPromise;
}

async function ensureSheets(sheets, spreadsheetId) {
    const metadata = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties.title' });
    const existingTitles = new Set((metadata.data.sheets || []).map((sheet) => sheet.properties?.title).filter(Boolean));
    const requests = SHEET_TITLES
        .filter((title) => !existingTitles.has(title))
        .map((title) => ({ addSheet: { properties: { title } } }));
    if (requests.length > 0) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: { requests },
        });
    }
}

function jsonValue(value) {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    return value;
}

function answerLabel(row) {
    if (row.type === 'multiple-answer') {
        const options = Array.isArray(row.options) ? row.options : [];
        const indexes = Array.isArray(row.answer) ? row.answer : [];
        return indexes.map((index) => `${Number(index) + 1}. ${options[Number(index)] || ''}`).join(' | ');
    }
    if (row.type !== 'multiple-choice') {
        return jsonValue(row.answer);
    }
    const options = Array.isArray(row.options) ? row.options : [];
    const index = Number(row.answer);
    return Number.isInteger(index) ? `${index + 1}. ${options[index] || ''}` : '';
}

function correctAnswerLabel(row) {
    if (row.type === 'multiple-answer') {
        const options = Array.isArray(row.options) ? row.options : [];
        const indexes = Array.isArray(row.correct_answers) ? row.correct_answers : [];
        return indexes.map((index) => `${Number(index) + 1}. ${options[Number(index)] || ''}`).join(' | ');
    }
    if (row.type !== 'multiple-choice') {
        return '';
    }
    const options = Array.isArray(row.options) ? row.options : [];
    const index = Number(row.correct_answer);
    return Number.isInteger(index) ? `${index + 1}. ${options[index] || ''}` : '';
}

async function buildParticipantsRows() {
    const rows = await query(`SELECT p.id,
            p.participant_code,
            p.name,
            p.email,
            p.phone,
            p.school,
            p.institution,
            p.status,
            p.created_at,
            t.name AS exam_theme_name,
            pt.name AS project_theme_name,
            COALESCE(es.exam_score, 0)::int AS exam_score,
            COALESCE(em.exam_max, 0)::int AS exam_max,
            ps.title AS project_title,
            ps.drive_file_url,
            ps.file_name,
            ps.score AS project_score,
            ps.feedback AS project_feedback,
            ps.status AS project_status
     FROM participants p
     LEFT JOIN themes t ON t.id = p.exam_theme
     LEFT JOIN project_themes pt ON pt.id = p.project_theme
     LEFT JOIN (
       SELECT participant_id, SUM(COALESCE(score, 0))::int AS exam_score
       FROM exam_answers
       GROUP BY participant_id
     ) es ON es.participant_id = p.id
     LEFT JOIN (
       SELECT theme_id, SUM(weight)::int AS exam_max
       FROM questions
       GROUP BY theme_id
     ) em ON em.theme_id = p.exam_theme
     LEFT JOIN (
       SELECT DISTINCT ON (participant_id)
              participant_id,
              title,
              file_name,
              drive_file_url,
              score,
              feedback,
              status
       FROM project_submissions
       ORDER BY participant_id, submitted_at DESC
     ) ps ON ps.participant_id = p.id
     ORDER BY p.created_at ASC`);

    return [
        ['Participant Code', 'Nama', 'NPM/Email', 'Phone', 'School', 'Institution', 'Status', 'Created At', 'Tema Kuis', 'Nilai Kuis', 'Maks Kuis', 'Tema Proyek', 'Judul Proyek', 'File Proyek', 'Link Drive Proyek', 'Nilai Proyek', 'Feedback Proyek', 'Status Proyek', 'Total Nilai', 'Total Maks'],
        ...rows.map((row) => {
            const projectScore = row.project_score ?? 0;
            const projectMax = row.project_theme_name ? 100 : 0;
            return [
                row.participant_code,
                row.name,
                row.email,
                row.phone,
                row.school,
                row.institution,
                row.status,
                row.created_at,
                row.exam_theme_name || '',
                row.exam_score,
                row.exam_max,
                row.project_theme_name || '',
                row.project_title || '',
                row.file_name || '',
                row.drive_file_url || '',
                row.project_score ?? '',
                row.project_feedback || '',
                row.project_status || '',
                Number(row.exam_score || 0) + Number(projectScore || 0),
                Number(row.exam_max || 0) + projectMax,
            ];
        }),
    ];
}

async function buildAnswersRows() {
    const rows = await query(`SELECT p.participant_code,
            p.name,
            p.email,
            t.name AS theme_name,
            q.id AS question_id,
            q.question,
            q.type,
            q.options,
            q.correct_answer,
            q.correct_answers,
            q.weight,
            ea.answer,
            ea.score,
            ea.feedback,
            ea.updated_at
     FROM exam_answers ea
     JOIN participants p ON p.id = ea.participant_id
     JOIN questions q ON q.id = ea.question_id
     LEFT JOIN themes t ON t.id = q.theme_id
     ORDER BY p.created_at ASC, q.id ASC`);

    return [
        ['Participant Code', 'Nama', 'NPM/Email', 'Tema Kuis', 'Question ID', 'Soal', 'Tipe', 'Jawaban Dipilih', 'Jawaban Benar', 'Nilai', 'Maks Nilai', 'Feedback', 'Updated At'],
        ...rows.map((row) => [
            row.participant_code,
            row.name,
            row.email,
            row.theme_name || '',
            row.question_id,
            row.question,
            row.type,
            answerLabel(row),
            correctAnswerLabel(row),
            row.score ?? '',
            row.weight,
            row.feedback || '',
            row.updated_at,
        ]),
    ];
}

async function buildProjectsRows() {
    const rows = await query(`SELECT p.participant_code,
            p.name,
            p.email,
            pt.name AS theme_name,
            ps.title,
            ps.file_name,
            ps.file_size,
            ps.drive_file_url,
            ps.submitted_at,
            ps.score,
            ps.feedback,
            ps.status
     FROM project_submissions ps
     JOIN participants p ON p.id = ps.participant_id
     JOIN project_themes pt ON pt.id = ps.theme_id
     ORDER BY ps.submitted_at ASC`);

    return [
        ['Participant Code', 'Nama', 'NPM/Email', 'Tema Proyek', 'Judul Proyek', 'File Name', 'File Size', 'Link Drive', 'Submitted At', 'Nilai Proyek', 'Feedback', 'Status'],
        ...rows.map((row) => [
            row.participant_code,
            row.name,
            row.email,
            row.theme_name,
            row.title,
            row.file_name,
            row.file_size,
            row.drive_file_url || '',
            row.submitted_at,
            row.score ?? '',
            row.feedback || '',
            row.status,
        ]),
    ];
}

async function writeSheet(sheets, spreadsheetId, title, values) {
    await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${title}!A:Z`,
    });
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${title}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
    });
}

async function syncSheetsNow() {
    const spreadsheetId = getSpreadsheetId();
    const sheets = await getSheetsClient();
    if (!sheets || !spreadsheetId) {
        return;
    }
    await ensureSheets(sheets, spreadsheetId);
    const [participantsRows, answersRows, projectsRows] = await Promise.all([
        buildParticipantsRows(),
        buildAnswersRows(),
        buildProjectsRows(),
    ]);
    await Promise.all([
        writeSheet(sheets, spreadsheetId, 'Participants', participantsRows),
        writeSheet(sheets, spreadsheetId, 'Answers', answersRows),
        writeSheet(sheets, spreadsheetId, 'Projects', projectsRows),
    ]);
    console.log('[Sheets] Export sync complete.');
}

export function queueSheetsSync(reason = 'update') {
    if (!isEnabled()) {
        return;
    }
    if (syncTimer) {
        clearTimeout(syncTimer);
    }
    syncTimer = setTimeout(() => {
        syncTimer = null;
        setImmediate(() => {
            syncPromise = (syncPromise || Promise.resolve())
                .catch(() => undefined)
                .then(() => syncSheetsNow())
                .catch((error) => {
                    console.warn(`[Sheets] Export sync failed after ${reason}: ${error?.message || 'Unknown error'}`);
                })
                .finally(() => {
                    syncPromise = null;
                });
        });
    }, 800);
    syncTimer.unref?.();
}
