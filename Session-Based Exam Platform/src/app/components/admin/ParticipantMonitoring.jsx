import { useEffect, useState } from 'react';
import { Paper, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, TextField, InputAdornment, } from '@mui/material';
import { Search, Download, Users, BarChart3, FolderOpen, CheckCircle } from 'lucide-react';
import { apiGet } from '../../utils/api';
import AdminShell, { AdminStatCard, adminFieldSx, adminPageSx, adminTableSx, primaryButtonSx } from './AdminShell';
export default function ParticipantMonitoring() {
    const [participants, setParticipants] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        apiGet('/api/admin/monitoring', true)
            .then((data) => setParticipants(data))
            .finally(() => setIsLoading(false));
    }, []);
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
    return (<AdminShell title="Participant Monitoring" description="Track participant progress in real-time." icon={<Users className="h-6 w-6"/>} actions={<Button variant="contained" startIcon={<Download />} sx={primaryButtonSx}>
        Export Data
      </Button>}>
        <Paper elevation={0} sx={{ ...adminPageSx, p: 2, mb: 2 }}>
          <TextField fullWidth size="small" placeholder="Search by name, NPM, or participant ID..." sx={adminFieldSx} InputProps={{
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
              {participants.map((participant) => (<TableRow key={participant.id} hover>
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
                    <span className={participant.status === 'exam' ? 'text-red-600 font-semibold' : ''}>
                      {participant.timeLeft}
                    </span>
                  </TableCell>
                </TableRow>))}
              {!isLoading && participants.length === 0 && (<TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <p className="text-gray-500">No participants yet.</p>
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
