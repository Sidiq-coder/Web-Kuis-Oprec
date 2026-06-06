import { query } from '../db/pool.js';

function normalizeNumber(value) {
    return String(value || '').trim();
}

function mapResult(row) {
    return {
        id: row.id,
        participantNumber: row.participant_number,
        status: row.status,
        note: row.note,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export async function checkParticipantResult(req, res) {
    const participantNumber = normalizeNumber(req.params.participantNumber);
    if (!participantNumber) {
        res.status(400).json({ error: 'Participant number is required' });
        return;
    }

    const [row] = await query(
        `SELECT id, participant_number, status, note, created_at, updated_at
         FROM participant_results
         WHERE participant_number = $1`,
        [participantNumber],
    );

    if (!row) {
        res.status(404).json({ error: 'Result not found' });
        return;
    }

    res.json(mapResult(row));
}

export async function listParticipantResults(_req, res) {
    const rows = await query(
        `SELECT id, participant_number, status, note, created_at, updated_at
         FROM participant_results
         ORDER BY updated_at DESC, created_at DESC`,
    );
    res.json(rows.map(mapResult));
}

export async function createParticipantResult(req, res) {
    const participantNumber = normalizeNumber(req.body?.participantNumber);
    const status = req.body?.status;
    const note = req.body?.note ? String(req.body.note).trim() : null;

    if (!participantNumber || !['accepted', 'rejected'].includes(status)) {
        res.status(400).json({ error: 'Participant number and valid status are required' });
        return;
    }

    const [row] = await query(
        `INSERT INTO participant_results (participant_number, status, note)
         VALUES ($1, $2, $3)
         ON CONFLICT (participant_number)
         DO UPDATE SET status = EXCLUDED.status,
                       note = EXCLUDED.note,
                       updated_at = NOW()
         RETURNING id, participant_number, status, note, created_at, updated_at`,
        [participantNumber, status, note],
    );

    res.status(201).json(mapResult(row));
}

export async function updateParticipantResult(req, res) {
    const { resultId } = req.params;
    const participantNumber = normalizeNumber(req.body?.participantNumber);
    const status = req.body?.status;
    const note = req.body?.note ? String(req.body.note).trim() : null;

    if (!participantNumber || !['accepted', 'rejected'].includes(status)) {
        res.status(400).json({ error: 'Participant number and valid status are required' });
        return;
    }

    const [row] = await query(
        `UPDATE participant_results
         SET participant_number = $2,
             status = $3,
             note = $4,
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, participant_number, status, note, created_at, updated_at`,
        [resultId, participantNumber, status, note],
    );

    if (!row) {
        res.status(404).json({ error: 'Result not found' });
        return;
    }

    res.json(mapResult(row));
}

export async function deleteParticipantResult(req, res) {
    const { resultId } = req.params;
    const deleted = await query('DELETE FROM participant_results WHERE id = $1 RETURNING id', [resultId]);
    if (deleted.length === 0) {
        res.status(404).json({ error: 'Result not found' });
        return;
    }
    res.status(204).send();
}
