import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import { pool, query } from '../db/pool.js';
import { ensureDriveFolderPath, isDriveConfigured, sanitizeDriveName, uploadFileToDrive } from '../services/driveService.js';
import { queueSheetsSync } from '../services/sheetsExportService.js';
function generateParticipantCode() {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `PART-${Date.now()}-${suffix}`;
}
export async function createParticipant(req, res) {
    const { name, npm, email, phone, school, institution } = req.body;
    const participantNpm = npm || email;
    if (!name || !participantNpm) {
        res.status(400).json({ error: 'Name and NPM are required' });
        return;
    }
    const participantCode = generateParticipantCode();
    const sessionToken = randomUUID();
    const [participant] = await query(`INSERT INTO participants (participant_code, session_token, name, email, phone, school, institution)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, participant_code AS "participantCode", session_token AS "sessionToken",
               name, email, phone, school, institution, exam_theme AS "examTheme",
               project_theme AS "projectTheme", status`, [
        participantCode,
        sessionToken,
        name,
        participantNpm,
        phone || '-',
        school || '-',
        institution || '-',
    ]);
    participant.npm = participant.email;
    res.status(201).json(participant);
    queueSheetsSync('participant-created');
}
export async function updateParticipant(req, res) {
    const { participantId } = req.params;
    const { examTheme, projectTheme, status } = req.body;
    const [updated] = await query(`UPDATE participants
     SET exam_theme = COALESCE($2, exam_theme),
         project_theme = COALESCE($3, project_theme),
         status = COALESCE($4, status)
     WHERE id = $1
     RETURNING id, participant_code AS "participantCode", session_token AS "sessionToken",
               name, email, phone, school, institution, exam_theme AS "examTheme",
               project_theme AS "projectTheme", status`, [participantId, examTheme ?? null, projectTheme ?? null, status ?? null]);
    if (!updated) {
        res.status(404).json({ error: 'Participant not found' });
        return;
    }
    updated.npm = updated.email;
    res.json(updated);
    queueSheetsSync('participant-updated');
}
export async function getParticipantStatus(req, res) {
    const { participantId } = req.params;
    const [participant] = await query(`SELECT id,
               participant_code AS "participantCode",
               exam_theme AS "examTheme",
               project_theme AS "projectTheme",
               status
     FROM participants
     WHERE id = $1`, [participantId]);
    if (!participant) {
        res.status(404).json({ error: 'Participant not found' });
        return;
    }
    res.json(participant);
}
export async function startExam(req, res) {
    const { participantId } = req.params;
    const { examTheme } = req.body;
    const [updated] = await query(`UPDATE participants
     SET exam_theme = COALESCE($2, exam_theme),
         status = 'exam',
         exam_started_at = COALESCE(exam_started_at, NOW())
     WHERE id = $1
     RETURNING id`, [participantId, examTheme ?? null]);
    if (!updated) {
        res.status(404).json({ error: 'Participant not found' });
        return;
    }
    res.json({ success: true });
    queueSheetsSync('exam-started');
}
export async function startProject(req, res) {
    const { participantId } = req.params;
    const { projectTheme } = req.body;
    const [updated] = await query(`UPDATE participants
     SET project_theme = COALESCE($2, project_theme),
         status = 'project',
         project_started_at = COALESCE(project_started_at, NOW())
     WHERE id = $1
     RETURNING id`, [participantId, projectTheme ?? null]);
    if (!updated) {
        res.status(404).json({ error: 'Participant not found' });
        return;
    }
    res.json({ success: true });
    queueSheetsSync('project-started');
}
export async function saveAnswer(req, res) {
    const { participantId } = req.params;
    const { questionId, answer } = req.body;
    if (!questionId) {
        res.status(400).json({ error: 'questionId is required' });
        return;
    }
    const [question] = await query('SELECT type, correct_answer, weight FROM questions WHERE id = $1', [questionId]);
    if (!question) {
        res.status(404).json({ error: 'Question not found' });
        return;
    }
    const normalizedAnswer = question.type === 'multiple-choice' ? Number(answer) : answer;
    const score = question.type === 'multiple-choice'
        ? (Number.isInteger(normalizedAnswer) && normalizedAnswer === question.correct_answer ? question.weight : 0)
        : null;
    await query(`INSERT INTO exam_answers (participant_id, question_id, answer, score)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (participant_id, question_id)
     DO UPDATE SET answer = EXCLUDED.answer,
                   score = EXCLUDED.score,
                   updated_at = NOW()`, [participantId, questionId, JSON.stringify(normalizedAnswer ?? null), score]);
    res.json({ success: true, score });
    queueSheetsSync('answer-saved');
}
export async function submitProject(req, res) {
    const { participantId } = req.params;
    const { themeId, title } = req.body;
    const file = req.file;
    if (!themeId || !title) {
        res.status(400).json({ error: 'themeId and title are required' });
        return;
    }
    if (!file) {
        res.status(400).json({ error: 'Project file is required' });
        return;
    }

    const enqueueDriveUpload = ({ submissionId, participant, uploadedFile }) => {
        setImmediate(async () => {
            try {
                console.log(`[Drive] Background upload started for submission ${submissionId} (participant ${participant.participant_code}).`);
                if (!isDriveConfigured()) {
                    console.warn(`[Drive] Background upload skipped for submission ${submissionId} because Drive is not configured.`);
                    return;
                }
                const safeThemeName = sanitizeDriveName(participant.theme_name, 'Theme');
                const safeParticipantName = sanitizeDriveName(participant.name, participant.participant_code);
                console.log(`[Drive] Resolving folder path for theme "${safeThemeName}" and participant "${safeParticipantName}".`);
                const driveFolderId = await ensureDriveFolderPath([safeThemeName, `${safeParticipantName} - ${participant.participant_code}`]);
                if (!driveFolderId) {
                    console.warn(`[Drive] Background upload stopped for submission ${submissionId} because Drive folder path could not be resolved.`);
                    return;
                }
                const driveFile = await uploadFileToDrive({
                    filePath: uploadedFile.path,
                    fileName: uploadedFile.originalname,
                    mimeType: uploadedFile.mimetype,
                    parentFolderId: driveFolderId,
                });
                if (!driveFile?.fileId) {
                    console.warn(`[Drive] Background upload finished without Drive file metadata for submission ${submissionId}.`);
                    return;
                }
                console.log(`[Drive] Updating submission ${submissionId} with Drive metadata ${driveFile.fileId}.`);
                await query(`UPDATE project_submissions
         SET drive_folder_id = $2,
             drive_file_id = $3,
             drive_file_url = $4
         WHERE id = $1`, [submissionId, driveFile.folderId, driveFile.fileId, driveFile.webViewLink]);
                queueSheetsSync('project-drive-uploaded');
                console.log(`[Drive] Background upload finished for submission ${submissionId}.`);
            }
            catch (driveError) {
                console.warn(`Background Google Drive upload failed: ${driveError?.message || 'Unknown error'}`);
            }
        });
    };

    const client = await pool.connect();
    try {
        const participantRows = await client.query(`SELECT p.id,
               p.name,
               p.participant_code,
               t.name AS theme_name
        FROM participants p
        JOIN project_themes t ON t.id = $2
        WHERE p.id = $1`, [participantId, themeId]);
        if (participantRows.rowCount === 0) {
            res.status(404).json({ error: 'Participant or theme not found' });
            return;
        }
        const participant = participantRows.rows[0];

        await client.query('BEGIN');
        const createdSubmission = await client.query(`INSERT INTO project_submissions (
          participant_id,
          theme_id,
          title,
          file_name,
          file_path,
          file_size,
          drive_folder_id,
          drive_file_id,
          drive_file_url
        ) VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL, NULL)
        RETURNING id`, [participantId, themeId, title, file.originalname, file.path, file.size]);
        await client.query(`UPDATE participants
         SET status = 'completed'
         WHERE id = $1`, [participantId]);
        await client.query('COMMIT');
        const submissionId = createdSubmission.rows[0]?.id;
        res.json({ success: true, submissionId });
        queueSheetsSync('project-submitted');

        if (submissionId && isDriveConfigured()) {
            console.log(`[Drive] Queueing background upload for submission ${submissionId}.`);
            enqueueDriveUpload({
                submissionId,
                participant,
                uploadedFile: file,
            });
        } else {
            console.log(`[Drive] Submission ${submissionId} will not enqueue Drive upload because Drive is not configured.`);
        }
    }
    catch (error) {
        await client.query('ROLLBACK').catch(() => { });
        await fs.unlink(file.path).catch(() => { });
        console.error(error);
        res.status(500).json({ error: 'Upload failed' });
    }
    finally {
        client.release();
    }
}
