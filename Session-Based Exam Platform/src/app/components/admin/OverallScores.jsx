import { useEffect, useMemo, useState } from 'react';
import { Paper, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, } from '@mui/material';
import { Download, FileDown, BarChart3 } from 'lucide-react';
import { apiGet, getApiBaseUrl } from '../../utils/api';
import AdminShell, { actionButtonSx, adminTableSx, primaryButtonSx, secondaryButtonSx } from './AdminShell';
export default function OverallScores() {
    const [rows, setRows] = useState([]);
    useEffect(() => {
        apiGet('/api/admin/overall-scores', true).then((data) => setRows(data));
    }, []);
    const exportRows = useMemo(() => rows, [rows]);
    const handleDownloadProject = async (submissionId, fileName) => {
        const token = localStorage.getItem('cbt_admin_token');
        const response = await fetch(`${getApiBaseUrl()}/api/admin/project-reviews/${submissionId}/download`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
        if (!response.ok) {
            return;
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName || 'project-file';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    };
    const handleExportCsv = () => {
        const headers = [
            'Participant Code',
            'Name',
            'NPM',
            'Status',
            'Theme',
            'Exam Score',
            'Exam Max',
            'Project Score',
            'Project Max',
            'Overall Score',
            'Overall Max',
            'Project File',
            'Project Status',
            'Project Submitted At',
        ];
        const lines = exportRows.map((row) => [
            row.id,
            row.name,
            row.npm || row.email,
            row.status,
            row.theme,
            row.examScore,
            row.examMax,
            row.projectScore ?? '',
            row.projectMax,
            row.overallScore,
            row.overallMax,
            row.projectFileName ?? '',
            row.projectStatus ?? '',
            row.projectSubmittedAt ?? '',
        ]);
        const escape = (value) => {
            const text = String(value ?? '');
            if (text.includes(',') || text.includes('"') || text.includes('\n')) {
                return `"${text.replace(/"/g, '""')}"`;
            }
            return text;
        };
        const csvContent = [headers, ...lines]
            .map((row) => row.map(escape).join(','))
            .join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'overall-scores.csv';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    };
    const handleExportPdf = () => {
        const htmlRows = exportRows
            .map((row) => `
          <tr>
            <td>${row.id}</td>
            <td>${row.name}</td>
            <td>${row.npm || row.email}</td>
            <td>${row.status}</td>
            <td>${row.theme}</td>
            <td>${row.examScore}/${row.examMax}</td>
            <td>${row.projectScore ?? '-'}${row.projectMax ? `/${row.projectMax}` : ''}</td>
            <td>${row.overallScore}/${row.overallMax}</td>
            <td>${row.projectFileName ?? '-'}</td>
            <td>${row.projectStatus ?? '-'}</td>
          </tr>`)
            .join('');
        const printWindow = window.open('', '_blank', 'width=1200,height=900');
        if (!printWindow) {
            return;
        }
        printWindow.document.write(`
      <html>
        <head>
          <title>Overall Scores</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 20px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>Overall Scores</h1>
          <table>
            <thead>
              <tr>
                <th>Participant Code</th>
                <th>Name</th>
                <th>NPM</th>
                <th>Status</th>
                <th>Theme</th>
                <th>Exam</th>
                <th>Project</th>
                <th>Total</th>
                <th>Project File</th>
                <th>Project Status</th>
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
    return (<AdminShell title="Overall Scores" description="Summary of participant exam and project results." icon={<BarChart3 className="h-6 w-6"/>} actions={<>
        <Button variant="outlined" startIcon={<FileDown />} onClick={handleExportCsv} sx={secondaryButtonSx}>Export CSV</Button>
        <Button variant="contained" startIcon={<FileDown />} onClick={handleExportPdf} sx={primaryButtonSx}>Export PDF</Button>
      </>}>
        <TableContainer component={Paper} sx={adminTableSx}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                <TableCell>Participant</TableCell>
                <TableCell>Theme</TableCell>
                <TableCell align="center">Exam Score</TableCell>
                <TableCell align="center">Project Score</TableCell>
                <TableCell align="center">Total</TableCell>
                <TableCell>Project File</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (<TableRow key={row.id} hover>
                  <TableCell>
                    <div>
                      <strong>{row.name}</strong>
                      <br />
                      <span className="text-sm text-gray-500">{row.id}</span>
                      <br />
                      <span className="text-xs text-gray-400">NPM: {row.npm || row.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>{row.theme}</TableCell>
                  <TableCell align="center">
                    <strong>{row.examScore}/{row.examMax}</strong>
                  </TableCell>
                  <TableCell align="center">
                    {row.projectScore !== null ? (<strong>{row.projectScore}/{row.projectMax}</strong>) : (<span className="text-gray-400">-</span>)}
                  </TableCell>
                  <TableCell align="center">
                    <strong>{row.overallScore}/{row.overallMax}</strong>
                  </TableCell>
                  <TableCell>
                    {row.projectFileName ? (<div className="text-sm">
                        {row.projectFileName}
                        {row.projectFileSize ? (<div className="text-xs text-gray-500">
                            {(row.projectFileSize / (1024 * 1024)).toFixed(2)} MB
                          </div>) : null}
                      </div>) : (<span className="text-gray-400">-</span>)}
                  </TableCell>
                  <TableCell>
                    <Chip label={row.status} color={row.status === 'completed' ? 'success' : 'default'} size="small"/>
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" startIcon={<Download className="w-4 h-4"/>} onClick={() => row.projectSubmissionId
                ? handleDownloadProject(row.projectSubmissionId, row.projectFileName)
                : undefined} disabled={!row.projectSubmissionId} sx={actionButtonSx}>
                      Download
                    </Button>
                  </TableCell>
                </TableRow>))}
              {rows.length === 0 && (<TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                    <p className="text-gray-500">No results available.</p>
                  </TableCell>
                </TableRow>)}
            </TableBody>
          </Table>
        </TableContainer>
    </AdminShell>);
}
