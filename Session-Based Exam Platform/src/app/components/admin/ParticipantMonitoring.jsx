import { useEffect, useState } from 'react';
import { Paper, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, TextField, InputAdornment, } from '@mui/material';
import { Search, FileDown, Users, BarChart3, FolderOpen, CheckCircle } from 'lucide-react';
import { apiGet } from '../../utils/api';
import AdminShell, { AdminStatCard, adminFieldSx, adminPageSx, adminTableSx, primaryButtonSx, secondaryButtonSx } from './AdminShell';
export default function ParticipantMonitoring() {
    const [participants, setParticipants] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        const loadParticipants = () => {
            apiGet('/api/admin/monitoring', true)
                .then((data) => setParticipants(data))
                .finally(() => setIsLoading(false));
        };
        loadParticipants();
        const refreshInterval = setInterval(loadParticipants, 30000);
        return () => clearInterval(refreshInterval);
    }, []);
    const formatTimeLeft = (seconds, status) => {
        if (typeof seconds !== 'number') {
            return '-';
        }
        if (status === 'project') {
            const hours = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    useEffect(() => {
        const countdownInterval = setInterval(() => {
            setParticipants((current) => current.map((participant) => {
                if (typeof participant.remainingSeconds !== 'number') {
                    return participant;
                }
                const remainingSeconds = Math.max(participant.remainingSeconds - 1, 0);
                return {
                    ...participant,
                    remainingSeconds,
                    timeLeft: formatTimeLeft(remainingSeconds, participant.status),
                };
            }));
        }, 1000);
        return () => clearInterval(countdownInterval);
    }, []);
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const filteredParticipants = participants.filter((participant) => {
        if (!normalizedSearch) {
            return true;
        }
        return [
            participant.id,
            participant.name,
            participant.npm,
            participant.email,
            participant.theme,
            participant.status,
        ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
    });
    const exportRows = filteredParticipants;
    const escapeCsv = (value) => {
        const text = String(value ?? '');
        if (text.includes(',') || text.includes('"') || text.includes('\n')) {
            return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
    };
    const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    const handleExportCsv = () => {
        const headers = [
            'Participant ID',
            'Name',
            'NPM',
            'Email',
            'Theme',
            'Status',
            'Progress',
            'Time Left',
        ];
        const lines = exportRows.map((participant) => [
            participant.id,
            participant.name,
            participant.npm || '',
            participant.email || '',
            participant.theme,
            getStatusLabel(participant.status),
            participant.progress,
            participant.timeLeft,
        ]);
        const csvContent = [headers, ...lines]
            .map((row) => row.map(escapeCsv).join(','))
            .join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'participant-monitoring.csv';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    };
    const handleExportPdf = () => {
        const htmlRows = exportRows
            .map((participant) => `
          <tr>
            <td>${escapeHtml(participant.id)}</td>
            <td>${escapeHtml(participant.name)}</td>
            <td>${escapeHtml(participant.npm || participant.email)}</td>
            <td>${escapeHtml(participant.theme)}</td>
            <td>${escapeHtml(getStatusLabel(participant.status))}</td>
            <td>${escapeHtml(participant.progress)}</td>
            <td>${escapeHtml(participant.timeLeft)}</td>
          </tr>`)
            .join('');
        const printWindow = window.open('', '_blank', 'width=1200,height=900');
        if (!printWindow) {
            return;
        }
        printWindow.document.write(`
      <html>
        <head>
          <title>Participant Monitoring</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            p { color: #555; font-size: 12px; margin: 0 0 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; vertical-align: top; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>Participant Monitoring</h1>
          <p>Exported rows: ${exportRows.length}</p>
          <table>
            <thead>
              <tr>
                <th>Participant ID</th>
                <th>Name</th>
                <th>NPM</th>
                <th>Theme</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Time Left</th>
              </tr>
            </thead>
            <tbody>
              ${htmlRows}
            </tbody>
          </table>
        </body>
      </html>
    `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'exam':
                return 'primary';
            case 'project':
                return 'warning';
            case 'completed':
                return 'success';
            default:
                return 'default';
        }
    };
    const getStatusLabel = (status) => {
        switch (status) {
            case 'exam':
                return 'Taking Exam';
            case 'project':
                return 'Project Phase';
            case 'completed':
                return 'Completed';
            default:
                return status;
        }
    };
    return (<AdminShell title="Participant Monitoring" description="Track participant progress in real-time." icon={<Users className="h-6 w-6"/>} actions={<>
        <Button variant="outlined" startIcon={<FileDown />} onClick={handleExportCsv} sx={secondaryButtonSx}>
          Export CSV
        </Button>
        <Button variant="contained" startIcon={<FileDown />} onClick={handleExportPdf} sx={primaryButtonSx}>
          Export PDF
        </Button>
      </>}>
        <Paper elevation={0} sx={{ ...adminPageSx, p: 2, mb: 2 }}>
          <TextField fullWidth size="small" placeholder="Search by name, NPM, or participant ID..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} sx={adminFieldSx} InputProps={{
            startAdornment: (<InputAdornment position="start">
                  <Search className="w-5 h-5 text-gray-400"/>
                </InputAdornment>),
        }}/>
        </Paper>

        <TableContainer component={Paper} sx={adminTableSx}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                <TableCell>Participant ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>NPM</TableCell>
                <TableCell>Theme</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Time Left</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredParticipants.map((participant) => (<TableRow key={participant.id} hover>
                  <TableCell>
                    <strong>{participant.id}</strong>
                  </TableCell>
                  <TableCell>{participant.name}</TableCell>
                  <TableCell>{participant.npm || participant.email}</TableCell>
                  <TableCell>{participant.theme}</TableCell>
                  <TableCell>
                    <Chip label={getStatusLabel(participant.status)} color={getStatusColor(participant.status)} size="small"/>
                  </TableCell>
                  <TableCell>{participant.progress}</TableCell>
                  <TableCell>
                    <span className={participant.status === 'exam' || participant.status === 'project' ? 'text-red-600 font-semibold' : ''}>
                      {participant.timeLeft}
                    </span>
                  </TableCell>
                </TableRow>))}
              {!isLoading && participants.length === 0 && (<TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <p className="text-gray-500">No participants yet.</p>
                  </TableCell>
                </TableRow>)}
              {!isLoading && participants.length > 0 && filteredParticipants.length === 0 && (<TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <p className="text-gray-500">No participants match your search.</p>
                  </TableCell>
                </TableRow>)}
            </TableBody>
          </Table>
        </TableContainer>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
          <AdminStatCard label="Currently In Exam" value={participants.filter((p) => p.status === 'exam').length} icon={<BarChart3 className="h-5 w-5"/>}/>
          <AdminStatCard label="In Project Phase" value={participants.filter((p) => p.status === 'project').length} icon={<FolderOpen className="h-5 w-5"/>} tone="amber"/>
          <AdminStatCard label="Completed Today" value={participants.filter((p) => p.status === 'completed').length} icon={<CheckCircle className="h-5 w-5"/>} tone="green"/>
          <AdminStatCard label="Total Participants" value={participants.length} icon={<Users className="h-5 w-5"/>}/>
        </div>
    </AdminShell>);
}
