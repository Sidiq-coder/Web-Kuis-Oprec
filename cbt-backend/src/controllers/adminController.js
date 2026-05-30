import bcrypt from 'bcrypt';
import fs from 'fs';
import fsp from 'fs/promises';
import { randomUUID } from 'crypto';
import path from 'path';
import { inflateRawSync } from 'zlib';
import { query } from '../db/pool.js';
import { downloadDriveFile, isDriveConfigured } from '../services/driveService.js';
import { queueSheetsSync } from '../services/sheetsExportService.js';

const TEXT_PREVIEW_LIMIT = 200 * 1024;
const ZIP_PREVIEW_LIMIT = 500;

const mimeTypes = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.jsx': 'text/javascript; charset=utf-8',
    '.ts': 'text/typescript; charset=utf-8',
    '.tsx': 'text/typescript; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.csv': 'text/csv; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
};

const textExtensions = new Set([
    '.txt', '.md', '.json', '.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.csv', '.xml',
    '.sql', '.env', '.yml', '.yaml', '.java', '.py', '.php', '.go', '.rs', '.c', '.cpp',
    '.h', '.hpp', '.cs', '.rb', '.sh', '.bat', '.ps1',
]);

function getSubmissionFilePath(submission) {
    if (!submission?.file_path) {
        return null;
    }
    const resolved = path.resolve(submission.file_path);
    return fs.existsSync(resolved) ? resolved : null;
}

function getPreviewKind(fileName) {
    const ext = path.extname(fileName || '').toLowerCase();
    if (ext === '.zip') return 'zip';
    if (ext === '.docx') return 'docx';
    if (ext === '.pdf') return 'pdf';
    if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext)) return 'image';
    if (textExtensions.has(ext)) return 'text';
    return 'unsupported';
}

function parseZipEntries(buffer) {
    const minEocdOffset = Math.max(0, buffer.length - 0xffff - 22);
    let eocdOffset = -1;
    for (let offset = buffer.length - 22; offset >= minEocdOffset; offset -= 1) {
        if (buffer.readUInt32LE(offset) === 0x06054b50) {
            eocdOffset = offset;
            break;
        }
    }
    if (eocdOffset === -1) {
        throw new Error('ZIP directory not found');
    }

    const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
    const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
    const entries = [];
    let offset = centralDirectoryOffset;
    for (let index = 0; index < totalEntries && offset + 46 <= buffer.length; index += 1) {
        if (buffer.readUInt32LE(offset) !== 0x02014b50) {
            break;
        }
        const compressedSize = buffer.readUInt32LE(offset + 20);
        const uncompressedSize = buffer.readUInt32LE(offset + 24);
        const fileNameLength = buffer.readUInt16LE(offset + 28);
        const extraLength = buffer.readUInt16LE(offset + 30);
        const commentLength = buffer.readUInt16LE(offset + 32);
        const fileNameStart = offset + 46;
        const fileNameEnd = fileNameStart + fileNameLength;
        const name = buffer.toString('utf8', fileNameStart, fileNameEnd);
        const localHeaderOffset = buffer.readUInt32LE(offset + 42);
        const isDirectory = name.endsWith('/');
        if (!isDirectory && entries.length < ZIP_PREVIEW_LIMIT) {
            entries.push({
                name,
                size: uncompressedSize,
                compressedSize,
                compressionMethod: buffer.readUInt16LE(offset + 10),
                localHeaderOffset,
            });
        }
        offset = fileNameEnd + extraLength + commentLength;
    }
    return { entries, totalEntries };
}

function readZipEntry(buffer, entry) {
    const offset = entry.localHeaderOffset;
    if (buffer.readUInt32LE(offset) !== 0x04034b50) {
        throw new Error('ZIP local file header not found');
    }
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const dataStart = offset + 30 + fileNameLength + extraLength;
    const dataEnd = dataStart + entry.compressedSize;
    const compressed = buffer.subarray(dataStart, dataEnd);
    if (entry.compressionMethod === 0) {
        return compressed;
    }
    if (entry.compressionMethod === 8) {
        return inflateRawSync(compressed);
    }
    throw new Error('Unsupported ZIP compression method');
}

function decodeXmlEntities(value) {
    return String(value || '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
}

function extractDocxText(buffer) {
    const archive = parseZipEntries(buffer);
    const documentEntry = archive.entries.find((entry) => entry.name === 'word/document.xml');
    if (!documentEntry) {
        throw new Error('DOCX document body not found');
    }
    const xml = readZipEntry(buffer, documentEntry).toString('utf8');
    return decodeXmlEntities(xml
        .replace(/<w:tab\/>/g, '\t')
        .replace(/<\/w:p>/g, '\n')
        .replace(/<\/w:tr>/g, '\n')
        .replace(/<\/w:tc>/g, '\t')
        .replace(/<[^>]+>/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim());
}
export async function adminLogin(req, res) {
    const { username, password } = req.body;
    if (!username || !password) {
        res.status(400).json({ error: 'Username and password are required' });
        return;
    }
    const admins = await query('SELECT id, password_hash FROM admins WHERE username = $1', [username]);
    if (admins.length === 0) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
    }
    const isValid = await bcrypt.compare(password, admins[0].password_hash);
    if (!isValid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
    }
    const token = randomUUID();
    const ttlHours = Number(process.env.ADMIN_TOKEN_TTL_HOURS || 8);
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    await query('INSERT INTO admin_sessions (admin_id, token, expires_at) VALUES ($1, $2, $3)', [admins[0].id, token, expiresAt.toISOString()]);
    res.json({ token });
}
export async function adminMe(req, res) {
    const adminId = req.adminId;
    if (!adminId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const [admin] = await query('SELECT id, username FROM admins WHERE id = $1', [adminId]);
    res.json(admin);
}
export async function getMonitoring(_req, res) {
    const rows = await query(`SELECT p.id,
            p.participant_code,
            p.name,
            p.email,
            p.status,
            t.name AS theme_name,
            COALESCE(COUNT(ea.question_id), 0)::int AS answered_count,
            COALESCE(q.total_questions, 0)::int AS total_questions,
            p.exam_started_at,
            p.project_started_at,
            COALESCE(ps.submission_count, 0)::int AS submission_count,
            COALESCE(t.duration_minutes, s.value::int, 60)::int AS exam_duration,
            COALESCE(pt.duration_minutes, 120)::int AS project_duration
     FROM participants p
     LEFT JOIN themes t ON t.id = p.exam_theme
     LEFT JOIN project_themes pt ON pt.id = p.project_theme
     LEFT JOIN exam_answers ea ON ea.participant_id = p.id
     LEFT JOIN (
       SELECT theme_id, COUNT(*) AS total_questions
       FROM questions
       GROUP BY theme_id
     ) q ON q.theme_id = p.exam_theme
     LEFT JOIN (
       SELECT participant_id, COUNT(*) AS submission_count
       FROM project_submissions
       GROUP BY participant_id
     ) ps ON ps.participant_id = p.id
     LEFT JOIN settings s ON s.key = 'examDuration'
     GROUP BY p.id, t.name, t.duration_minutes, pt.duration_minutes, q.total_questions, ps.submission_count, s.value
     ORDER BY p.created_at DESC`);
    const data = rows.map((row) => {
        let progress = '-';
        if (row.status === 'exam') {
            progress = `${row.answered_count}/${row.total_questions} questions`;
        }
        else if (row.status === 'waiting-exam') {
            progress = 'Waiting for quiz approval';
        }
        else if (row.status === 'waiting-project') {
            progress = 'Waiting for project approval';
        }
        else if (row.status === 'project') {
            progress = row.submission_count > 0 ? 'Uploaded' : 'Pending';
        }
        else if (row.status === 'completed') {
            progress = 'Finished';
        }
        let timeLeft = '-';
        let remainingSeconds = null;
        if (row.status === 'exam' && row.exam_started_at) {
            const examDuration = Number(row.exam_duration || 60) * 60;
            const elapsed = Math.floor((Date.now() - new Date(row.exam_started_at).getTime()) / 1000);
            const remaining = Math.max(examDuration - elapsed, 0);
            remainingSeconds = remaining;
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            timeLeft = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        else if (row.status === 'project' && row.project_started_at) {
            const projectDuration = Number(row.project_duration || 120) * 60;
            const elapsed = Math.floor((Date.now() - new Date(row.project_started_at).getTime()) / 1000);
            const remaining = Math.max(projectDuration - elapsed, 0);
            remainingSeconds = remaining;
            const hours = Math.floor(remaining / 3600);
            const mins = Math.floor((remaining % 3600) / 60);
            const secs = remaining % 60;
            timeLeft = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return {
            id: row.participant_code,
            name: row.name,
            email: row.email,
            npm: row.email,
            theme: row.theme_name || '-',
            status: row.status,
            progress,
            timeLeft,
            remainingSeconds,
        };
    });
    res.json(data);
}
export async function getEssayReviews(_req, res) {
    const rows = await query(`SELECT ea.id,
            p.name AS participant_name,
            p.participant_code,
            t.name AS theme_name,
            q.question,
            q.weight AS max_score,
            ea.answer::text AS answer,
            ea.score,
            ea.feedback
     FROM exam_answers ea
     JOIN questions q ON q.id = ea.question_id
     JOIN participants p ON p.id = ea.participant_id
     LEFT JOIN themes t ON t.id = q.theme_id
     WHERE q.type = 'essay'
     ORDER BY ea.created_at DESC`);
    const data = rows.map((row) => ({
        id: row.id,
        participantName: row.participant_name,
        participantId: row.participant_code,
        theme: row.theme_name || '-',
        question: row.question,
        answer: row.answer ? JSON.parse(row.answer) : '',
        maxScore: row.max_score,
        currentScore: row.score,
        status: row.score === null ? 'pending' : 'graded',
        feedback: row.feedback,
    }));
    res.json(data);
}
export async function updateEssayReview(req, res) {
    const { answerId } = req.params;
    const { score, feedback } = req.body;
    const [updated] = await query(`UPDATE exam_answers
     SET score = $2,
         feedback = $3,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id`, [answerId, score ?? null, feedback ?? null]);
    if (!updated) {
        res.status(404).json({ error: 'Answer not found' });
        return;
    }
    res.json({ success: true });
    queueSheetsSync('essay-reviewed');
}
export async function getProjectReviews(_req, res) {
    const rows = await query(`SELECT ps.id,
            p.name AS participant_name,
            p.participant_code,
            t.name AS theme_name,
            ps.title,
            ps.file_name,
            ps.file_size,
            ps.submitted_at,
            ps.score,
            ps.status,
            ps.feedback
     FROM project_submissions ps
     JOIN participants p ON p.id = ps.participant_id
     JOIN project_themes t ON t.id = ps.theme_id
     ORDER BY ps.submitted_at DESC`);
    const data = rows.map((row) => ({
        id: row.id,
        participantName: row.participant_name,
        participantId: row.participant_code,
        theme: row.theme_name,
        projectTitle: row.title,
        fileName: row.file_name,
        fileSize: row.file_size,
        submittedAt: row.submitted_at,
        maxScore: 100,
        currentScore: row.score,
        status: row.status,
        feedback: row.feedback,
    }));
    res.json(data);
}
export async function updateProjectReview(req, res) {
    const { submissionId } = req.params;
    const { score, feedback, status } = req.body;
    const [updated] = await query(`UPDATE project_submissions
     SET score = $2,
         feedback = $3,
         status = COALESCE($4, status)
     WHERE id = $1
     RETURNING id`, [submissionId, score ?? null, feedback ?? null, status ?? null]);
    if (!updated) {
        res.status(404).json({ error: 'Submission not found' });
        return;
    }
    res.json({ success: true });
    queueSheetsSync('project-reviewed');
}
export async function downloadProjectFile(req, res) {
    const { submissionId } = req.params;
    const rows = await query('SELECT file_path, file_name, drive_file_id, drive_file_url FROM project_submissions WHERE id = $1', [submissionId]);
    if (rows.length === 0) {
        res.status(404).json({ error: 'File not found' });
        return;
    }
    const submission = rows[0];
    if (submission.drive_file_id && isDriveConfigured()) {
        try {
            await downloadDriveFile(submission.drive_file_id, res, submission.file_name);
            return;
        }
        catch (error) {
            console.error(error);
        }
    }
    const filePath = submission.file_path;
    if (filePath && fs.existsSync(path.resolve(filePath))) {
        res.download(path.resolve(filePath), submission.file_name);
        return;
    }
    if (submission.drive_file_url) {
        res.status(404).json({ error: 'File is stored in Drive but cannot be downloaded right now' });
        return;
    }
    res.status(404).json({ error: 'File not found' });
}

export async function getProjectFilePreview(req, res) {
    const { submissionId } = req.params;
    const rows = await query('SELECT file_path, file_name, file_size, drive_file_url FROM project_submissions WHERE id = $1', [submissionId]);
    if (rows.length === 0) {
        res.status(404).json({ error: 'File not found' });
        return;
    }
    const submission = rows[0];
    const filePath = getSubmissionFilePath(submission);
    if (!filePath) {
        res.status(404).json({
            error: submission.drive_file_url
                ? 'Preview belum tersedia dari Drive. Gunakan download jika file lokal tidak ada.'
                : 'File not found',
        });
        return;
    }

    const previewKind = getPreviewKind(submission.file_name);
    const ext = path.extname(submission.file_name || '').toLowerCase();
    const basePayload = {
        fileName: submission.file_name,
        fileSize: submission.file_size,
        extension: ext || '-',
        type: previewKind,
    };

    try {
        if (previewKind === 'zip') {
            const buffer = await fsp.readFile(filePath);
            const archive = parseZipEntries(buffer);
            res.json({
                ...basePayload,
                entries: archive.entries,
                totalEntries: archive.totalEntries,
                truncated: archive.entries.length >= ZIP_PREVIEW_LIMIT && archive.totalEntries > ZIP_PREVIEW_LIMIT,
            });
            return;
        }
        if (previewKind === 'text') {
            const handle = await fsp.open(filePath, 'r');
            try {
                const buffer = Buffer.alloc(Math.min(Number(submission.file_size || 0), TEXT_PREVIEW_LIMIT));
                const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
                res.json({
                    ...basePayload,
                    content: buffer.subarray(0, bytesRead).toString('utf8'),
                    truncated: Number(submission.file_size || 0) > TEXT_PREVIEW_LIMIT,
                });
            }
            finally {
                await handle.close();
            }
            return;
        }
        if (previewKind === 'docx') {
            const buffer = await fsp.readFile(filePath);
            const content = extractDocxText(buffer);
            res.json({
                ...basePayload,
                content: content.slice(0, TEXT_PREVIEW_LIMIT),
                truncated: content.length > TEXT_PREVIEW_LIMIT,
                message: content ? null : 'DOCX tidak berisi teks yang bisa diekstrak.',
            });
            return;
        }
        if (previewKind === 'pdf' || previewKind === 'image') {
            res.json({
                ...basePayload,
                contentUrl: `/api/admin/project-reviews/${submissionId}/preview/content`,
            });
            return;
        }
        res.json({
            ...basePayload,
            message: 'Format file ini belum bisa ditampilkan langsung. Silakan gunakan download.',
        });
    }
    catch (error) {
        console.error(error);
        res.status(422).json({ error: 'Preview file gagal dibuat' });
    }
}

export async function streamProjectFilePreview(req, res) {
    const { submissionId } = req.params;
    const rows = await query('SELECT file_path, file_name FROM project_submissions WHERE id = $1', [submissionId]);
    if (rows.length === 0) {
        res.status(404).json({ error: 'File not found' });
        return;
    }
    const submission = rows[0];
    const filePath = getSubmissionFilePath(submission);
    if (!filePath) {
        res.status(404).json({ error: 'File not found' });
        return;
    }
    const previewKind = getPreviewKind(submission.file_name);
    if (previewKind !== 'pdf' && previewKind !== 'image') {
        res.status(415).json({ error: 'File type cannot be streamed for preview' });
        return;
    }
    const ext = path.extname(submission.file_name || '').toLowerCase();
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${submission.file_name.replace(/"/g, '\\"')}"`);
    fs.createReadStream(filePath).pipe(res);
}
export async function getOverallScores(_req, res) {
    const rows = await query(`SELECT p.id,
            p.participant_code,
            p.name,
            p.email,
            p.status,
            p.exam_theme,
            p.project_theme,
            t.name AS theme_name,
            pt.name AS project_theme_name,
            es.exam_score,
            em.exam_max,
            ps.id AS project_submission_id,
            ps.file_name,
            ps.file_size,
            ps.submitted_at,
            ps.score AS project_score,
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
              id,
              participant_id,
              file_name,
              file_size,
              submitted_at,
              score,
              status
       FROM project_submissions
       ORDER BY participant_id, submitted_at DESC
     ) ps ON ps.participant_id = p.id
     ORDER BY p.created_at DESC`);
    const data = rows.map((row) => {
        const examScore = row.exam_score ?? 0;
        const examMax = row.exam_max ?? 0;
        const projectMax = row.project_theme ? 100 : 0;
        const projectScore = row.project_score ?? 0;
        const overallScore = examScore + projectScore;
        const overallMax = examMax + projectMax;
        return {
            id: row.participant_code,
            name: row.name,
            email: row.email,
            npm: row.email,
            status: row.status,
            theme: row.theme_name || '-',
            projectTheme: row.project_theme_name || '-',
            examScore,
            examMax,
            projectScore: row.project_score,
            projectMax,
            overallScore,
            overallMax,
            projectSubmissionId: row.project_submission_id,
            projectFileName: row.file_name,
            projectFileSize: row.file_size,
            projectSubmittedAt: row.submitted_at,
            projectStatus: row.project_status,
        };
    });
    res.json(data);
}

export async function resetParticipantSessions(_req, res) {
    const sessionResetVersion = `${Date.now()}`;
    await query(`INSERT INTO settings (key, value)
     VALUES ('sessionResetVersion', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [sessionResetVersion]);
    const clearedWaiting = await query(`UPDATE participants
     SET status = 'biodata',
         exam_theme = NULL,
         project_theme = NULL,
         project_case = NULL,
         exam_started_at = NULL,
         project_started_at = NULL
     WHERE status IN ('waiting-exam', 'waiting-project')
     RETURNING id`);
    res.json({ success: true, sessionResetVersion, clearedWaitingCount: clearedWaiting.length });
    queueSheetsSync('sessions-reset');
}

export async function getWaitingRoomConfig(_req, res) {
    const settings = await query(`SELECT key, value FROM settings WHERE key = 'waitingRoomEnabled'`);
    const enabled = ['1', 'true', 'yes'].includes(String(settings[0]?.value || '').toLowerCase());
    res.json({ enabled });
    queueSheetsSync('waiting-room-config-updated');
}

export async function updateWaitingRoomConfig(req, res) {
    const enabled = Boolean(req.body?.enabled);
    await query(`INSERT INTO settings (key, value)
     VALUES ('waitingRoomEnabled', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [String(enabled)]);
    if (!enabled) {
        await query(`UPDATE participants
         SET status = CASE
           WHEN status = 'waiting-exam' THEN 'exam'
           WHEN status = 'waiting-project' THEN 'project'
           ELSE status
         END
         WHERE status IN ('waiting-exam', 'waiting-project')`);
    }
    res.json({ enabled });
}

export async function getWaitingParticipants(_req, res) {
    const rows = await query(`SELECT p.id,
            p.participant_code AS "participantCode",
            p.name,
            p.email,
            p.status,
            p.created_at AS "createdAt",
            t.name AS "examTheme",
            pt.name AS "projectTheme"
     FROM participants p
     LEFT JOIN themes t ON t.id = p.exam_theme
     LEFT JOIN project_themes pt ON pt.id = p.project_theme
     WHERE p.status IN ('waiting-exam', 'waiting-project')
     ORDER BY p.created_at ASC`);
    res.json(rows.map((row) => ({
        ...row,
        stage: row.status === 'waiting-exam' ? 'quiz' : 'project',
        theme: row.status === 'waiting-exam' ? row.examTheme : row.projectTheme,
    })));
}

export async function approveWaitingParticipant(req, res) {
    const { participantId } = req.params;
    const [updated] = await query(`UPDATE participants
     SET status = CASE
       WHEN status = 'waiting-exam' THEN 'exam'
       WHEN status = 'waiting-project' THEN 'project'
       ELSE status
     END
     WHERE id = $1
       AND status IN ('waiting-exam', 'waiting-project')
     RETURNING id, participant_code AS "participantCode", status`, [participantId]);
    if (!updated) {
        res.status(404).json({ error: 'Waiting participant not found' });
        return;
    }
    res.json(updated);
    queueSheetsSync('waiting-participant-approved');
}

export async function approveAllWaitingParticipants(_req, res) {
    const updated = await query(`UPDATE participants
     SET status = CASE
       WHEN status = 'waiting-exam' THEN 'exam'
       WHEN status = 'waiting-project' THEN 'project'
       ELSE status
     END
    WHERE status IN ('waiting-exam', 'waiting-project')
     RETURNING id`);
    res.json({ success: true, count: updated.length });
    queueSheetsSync('all-waiting-participants-approved');
}
