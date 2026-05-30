import { useEffect, useState } from 'react';
import { Button, Chip, FormControlLabel, Paper, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { CheckCircle2, Clock, RefreshCw, ShieldCheck } from 'lucide-react';
import { apiGet, apiPatch, apiPost } from '../../utils/api';
import AdminShell, { actionButtonSx, adminPageSx, adminTableSx, primaryButtonSx } from './AdminShell';

export default function WaitingRoomManagement() {
    const [enabled, setEnabled] = useState(false);
    const [participants, setParticipants] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [config, waitingParticipants] = await Promise.all([
                apiGet('/api/admin/waiting-room/config', true),
                apiGet('/api/admin/waiting-room/participants', true),
            ]);
            setEnabled(Boolean(config.enabled));
            setParticipants(waitingParticipants);
        }
        catch {
            setMessage('Gagal memuat data ruang tunggu.');
        }
        finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const intervalId = window.setInterval(loadData, 5000);
        return () => window.clearInterval(intervalId);
    }, []);

    const updateEnabled = async (value) => {
        setEnabled(value);
        setMessage('');
        try {
            const config = await apiPatch('/api/admin/waiting-room/config', { enabled: value }, true);
            setEnabled(Boolean(config.enabled));
            if (!value) {
                setMessage('Ruang tunggu dinonaktifkan. Peserta yang menunggu sudah dilepas.');
            }
            await loadData();
        }
        catch {
            setEnabled(!value);
            setMessage('Gagal mengubah status ruang tunggu.');
        }
    };

    const approveParticipant = async (participantId) => {
        setMessage('');
        try {
            await apiPost(`/api/admin/waiting-room/participants/${participantId}/approve`, {}, true);
            await loadData();
        }
        catch {
            setMessage('Gagal mengizinkan peserta.');
        }
    };

    const approveAll = async () => {
        setMessage('');
        try {
            const result = await apiPost('/api/admin/waiting-room/participants/approve-all', {}, true);
            setMessage(`${result.count || 0} peserta sudah diizinkan masuk.`);
            await loadData();
        }
        catch {
            setMessage('Gagal mengizinkan semua peserta.');
        }
    };

    return (<AdminShell title="Waiting Room" description="Atur antrean peserta sebelum masuk ke kuis atau proyek." icon={<ShieldCheck className="h-6 w-6"/>} actions={<div className="flex flex-wrap gap-2">
        <Button variant="outlined" startIcon={<RefreshCw />} onClick={loadData} sx={actionButtonSx}>Refresh</Button>
        <Button variant="contained" startIcon={<CheckCircle2 />} onClick={approveAll} disabled={participants.length === 0} sx={primaryButtonSx}>Izinkan Semua</Button>
      </div>}>
      <Paper elevation={0} sx={{ ...adminPageSx, p: 2, mb: 2 }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-xs font-semibold text-[#1e5ba8]">waiting.room</p>
            <h2 className="text-lg font-semibold text-slate-950">Mode Ruang Tunggu</h2>
            <p className="mt-1 text-sm text-slate-600">
              Saat aktif, peserta yang akan masuk kuis atau proyek harus menunggu persetujuan admin.
            </p>
          </div>
          <FormControlLabel control={<Switch checked={enabled} onChange={(event) => updateEnabled(event.target.checked)}/>} label={enabled ? 'Aktif' : 'Nonaktif'}/>
        </div>
      </Paper>

      {message && (<div className="mb-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm">
        {message}
      </div>)}

      <TableContainer component={Paper} sx={adminTableSx}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Peserta</TableCell>
              <TableCell>Bagian</TableCell>
              <TableCell>Tema</TableCell>
              <TableCell>Waktu Masuk</TableCell>
              <TableCell align="right">Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {participants.map((participant) => (<TableRow key={participant.id} hover>
              <TableCell>
                <p className="font-semibold text-slate-950">{participant.name}</p>
                <p className="text-xs text-slate-500">{participant.email}</p>
              </TableCell>
              <TableCell>
                <Chip label={participant.stage === 'quiz' ? 'Kuis' : 'Proyek'} color={participant.stage === 'quiz' ? 'primary' : 'success'} size="small"/>
              </TableCell>
              <TableCell>{participant.theme || '-'}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock className="h-4 w-4 text-[#1e5ba8]"/>
                  {participant.createdAt ? new Date(participant.createdAt).toLocaleString('id-ID') : '-'}
                </div>
              </TableCell>
              <TableCell align="right">
                <Button size="small" startIcon={<CheckCircle2 className="h-4 w-4"/>} onClick={() => approveParticipant(participant.id)} sx={actionButtonSx}>
                  Izinkan Masuk
                </Button>
              </TableCell>
            </TableRow>))}
            {!isLoading && participants.length === 0 && (<TableRow>
              <TableCell colSpan={5} align="center" sx={{ py: 5 }}>Tidak ada peserta yang sedang menunggu.</TableCell>
            </TableRow>)}
            {isLoading && participants.length === 0 && (<TableRow>
              <TableCell colSpan={5} align="center" sx={{ py: 5 }}>Memuat data ruang tunggu...</TableCell>
            </TableRow>)}
          </TableBody>
        </Table>
      </TableContainer>
    </AdminShell>);
}
