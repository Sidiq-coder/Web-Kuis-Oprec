import { useEffect, useMemo, useState } from 'react';
import {
    Button,
    Chip,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
} from '@mui/material';
import { ClipboardCheck, Edit3, Plus, Trash2, X } from 'lucide-react';
import { apiDelete, apiGet, apiPatch, apiPost } from '../../utils/api';
import AdminShell, { actionButtonSx, adminFieldSx, adminPageSx, adminSelectSx, adminTableSx, primaryButtonSx, secondaryButtonSx } from './AdminShell';

const emptyForm = {
    participantNumber: '',
    status: 'accepted',
    note: '',
};

const statusLabels = {
    accepted: 'Diterima',
    rejected: 'Tidak Diterima',
};

export default function ParticipantResults() {
    const [rows, setRows] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [message, setMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const isEditing = useMemo(() => Boolean(editingId), [editingId]);

    const loadRows = async () => {
        const data = await apiGet('/api/admin/participant-results', true);
        setRows(data);
    };

    useEffect(() => {
        loadRows().catch(() => setMessage('Gagal memuat data status peserta.'));
    }, []);

    const resetForm = () => {
        setForm(emptyForm);
        setEditingId(null);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const participantNumber = form.participantNumber.trim();
        if (!participantNumber) {
            setMessage('Nomor peserta wajib diisi.');
            return;
        }

        setIsSaving(true);
        setMessage('');
        try {
            const payload = {
                participantNumber,
                status: form.status,
                note: form.note.trim() || null,
            };
            if (isEditing) {
                await apiPatch(`/api/admin/participant-results/${editingId}`, payload, true);
                setMessage('Status peserta berhasil diperbarui.');
            }
            else {
                await apiPost('/api/admin/participant-results', payload, true);
                setMessage('Status peserta berhasil disimpan.');
            }
            resetForm();
            await loadRows();
        }
        catch {
            setMessage('Gagal menyimpan status. Pastikan nomor peserta tidak konflik dengan data lain.');
        }
        finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (row) => {
        setEditingId(row.id);
        setForm({
            participantNumber: row.participantNumber,
            status: row.status,
            note: row.note || '',
        });
        setMessage('');
    };

    const handleDelete = async (row) => {
        const confirmed = window.confirm(`Hapus status untuk nomor ${row.participantNumber}?`);
        if (!confirmed) {
            return;
        }
        try {
            await apiDelete(`/api/admin/participant-results/${row.id}`, true);
            setMessage('Status peserta berhasil dihapus.');
            await loadRows();
            if (editingId === row.id) {
                resetForm();
            }
        }
        catch {
            setMessage('Gagal menghapus status peserta.');
        }
    };

    return (
        <AdminShell title="Participant Results" description="Isi nomor peserta dan status kelulusan yang bisa dicek peserta." icon={<ClipboardCheck className="h-6 w-6" />}>
            {message && (
                <div className="mb-3 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm">
                    {message}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.42fr_0.58fr]">
                <Paper elevation={0} sx={adminPageSx}>
                    <form onSubmit={handleSubmit} className="p-4">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-950">{isEditing ? 'Edit Status' : 'Tambah Status'}</h2>
                                <p className="mt-1 text-sm leading-6 text-slate-600">Nomor ini dipakai peserta di halaman cek kelulusan.</p>
                            </div>
                            {isEditing && (
                                <Button size="small" startIcon={<X />} onClick={resetForm} sx={secondaryButtonSx}>
                                    Batal
                                </Button>
                            )}
                        </div>

                        <TextField
                            fullWidth
                            label="Nomor peserta"
                            value={form.participantNumber}
                            onChange={(event) => setForm((current) => ({ ...current, participantNumber: event.target.value }))}
                            placeholder="Contoh: OPREC-001"
                            sx={adminFieldSx}
                        />

                        <FormControl fullWidth sx={{ mt: 1.25 }}>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={form.status}
                                label="Status"
                                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                                sx={adminSelectSx}
                            >
                                <MenuItem value="accepted">Diterima</MenuItem>
                                <MenuItem value="rejected">Tidak Diterima</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            fullWidth
                            multiline
                            minRows={3}
                            label="Catatan opsional"
                            value={form.note}
                            onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                            sx={{ ...adminFieldSx, mt: 1.25 }}
                        />

                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            startIcon={<Plus />}
                            disabled={isSaving}
                            sx={{ ...primaryButtonSx, mt: 2 }}
                        >
                            {isSaving ? 'Menyimpan...' : isEditing ? 'Update Status' : 'Simpan Status'}
                        </Button>
                    </form>
                </Paper>

                <TableContainer component={Paper} sx={adminTableSx}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Nomor Peserta</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Catatan</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow key={row.id} hover>
                                    <TableCell>
                                        <strong>{row.participantNumber}</strong>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={statusLabels[row.status] || row.status}
                                            color={row.status === 'accepted' ? 'success' : 'error'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <span className="line-clamp-2 text-sm text-slate-600">{row.note || '-'}</span>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Button size="small" startIcon={<Edit3 className="h-4 w-4" />} onClick={() => handleEdit(row)} sx={actionButtonSx}>
                                            Edit
                                        </Button>
                                        <Button size="small" color="error" startIcon={<Trash2 className="h-4 w-4" />} onClick={() => handleDelete(row)} sx={actionButtonSx}>
                                            Hapus
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {rows.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                                        <p className="text-gray-500">Belum ada status peserta.</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </div>
        </AdminShell>
    );
}
