import { useEffect, useState } from 'react';
import { Paper, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip, Rating, Alert, CircularProgress, IconButton, Tooltip, } from '@mui/material';
import { Download, Eye, Save, FileArchive, FolderOpen, ClipboardCheck, FileText, Image as ImageIcon } from 'lucide-react';
import { apiGet, apiPatch, getApiBaseUrl } from '../../utils/api';
import AdminShell, { actionButtonSx, AdminStatCard, adminDialogActionsSx, adminDialogPaperSx, adminFieldSx, adminTableSx, primaryButtonSx, secondaryButtonSx } from './AdminShell';
export default function ProjectReview() {
    const [projects, setProjects] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewProject, setPreviewProject] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [previewBlobUrl, setPreviewBlobUrl] = useState('');
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState('');
    const [selectedProject, setSelectedProject] = useState(null);
    const [score, setScore] = useState(0);
    const [feedback, setFeedback] = useState('');
    useEffect(() => {
        apiGet('/api/admin/project-reviews', true).then((data) => setProjects(data));
    }, []);
    const handleOpenDialog = (project) => {
        setSelectedProject(project);
        setScore(project.currentScore || 0);
        setFeedback('');
        setDialogOpen(true);
    };
    const clearPreviewBlob = () => {
        if (previewBlobUrl) {
            window.URL.revokeObjectURL(previewBlobUrl);
        }
        setPreviewBlobUrl('');
    };
    const handleOpenPreview = async (project) => {
        clearPreviewBlob();
        setPreviewProject(project);
        setPreviewData(null);
        setPreviewError('');
        setPreviewLoading(true);
        setPreviewOpen(true);
        try {
            const data = await apiGet(`/api/admin/project-reviews/${project.id}/preview`, true);
            setPreviewData(data);
            if (data.contentUrl) {
                const token = localStorage.getItem('cbt_admin_token');
                const response = await fetch(`${getApiBaseUrl()}${data.contentUrl}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                });
                if (!response.ok) {
                    throw new Error(await response.text() || 'Preview content failed');
                }
                const blob = await response.blob();
                setPreviewBlobUrl(window.URL.createObjectURL(blob));
            }
        }
        catch (error) {
            setPreviewError(error?.message || 'Preview gagal dimuat.');
        }
        finally {
            setPreviewLoading(false);
        }
    };
    const handleClosePreview = () => {
        setPreviewOpen(false);
        setPreviewProject(null);
        setPreviewData(null);
        setPreviewError('');
        clearPreviewBlob();
    };
    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedProject(null);
        setScore(0);
        setFeedback('');
    };
    const handleSaveGrade = async () => {
        if (!selectedProject)
            return;
        await apiPatch(`/api/admin/project-reviews/${selectedProject.id}`, { score, feedback, status: 'graded' }, true);
        setProjects((prev) => prev.map((project) => project.id === selectedProject.id
            ? { ...project, currentScore: score, status: 'graded', feedback }
            : project));
        handleCloseDialog();
    };
    const handleDownload = async (project) => {
        const token = localStorage.getItem('cbt_admin_token');
        const response = await fetch(`${getApiBaseUrl()}/api/admin/project-reviews/${project.id}/download`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!response.ok) {
            return;
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = project.fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    };
    const formatBytes = (bytes) => {
        if (!bytes)
            return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
        return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
    };
    const renderPreviewContent = () => {
        if (previewLoading) {
            return (<div className="flex min-h-80 flex-1 items-center justify-center">
                <CircularProgress size={32}/>
              </div>);
        }
        if (previewError) {
            return <Alert severity="error">{previewError}</Alert>;
        }
        if (!previewData) {
            return null;
        }
        if (previewData.type === 'zip') {
            return (<div className="flex min-h-0 flex-1 flex-col space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                  <div>
                    <p className="text-sm text-gray-500">Isi arsip ZIP</p>
                    <p className="text-gray-800">{previewData.entries?.length || 0} dari {previewData.totalEntries || 0} item ditampilkan</p>
                  </div>
                  <FileArchive className="h-6 w-6 text-gray-500"/>
                </div>
                {previewData.truncated && <Alert severity="info">Preview dibatasi ke {previewData.entries.length} file pertama.</Alert>}
                <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-gray-200">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Path</TableCell>
                        <TableCell align="right">Size</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(previewData.entries || []).map((entry) => (<TableRow key={entry.name}>
                          <TableCell><span className="font-mono text-xs">{entry.name}</span></TableCell>
                          <TableCell align="right">{formatBytes(entry.size)}</TableCell>
                        </TableRow>))}
                    </TableBody>
                  </Table>
                </div>
              </div>);
        }
        if (previewData.type === 'text' || previewData.type === 'docx') {
            return (<div className="flex min-h-0 flex-1 flex-col space-y-3">
                {previewData.truncated && <Alert severity="info">Preview teks dipotong karena ukuran file besar.</Alert>}
                {previewData.message && <Alert severity="info">{previewData.message}</Alert>}
                <pre className="min-h-0 flex-1 whitespace-pre-wrap overflow-auto rounded-lg bg-gray-950 p-4 text-sm leading-relaxed text-gray-100">{previewData.content}</pre>
              </div>);
        }
        if (previewData.type === 'image' && previewBlobUrl) {
            return (<div className="flex min-h-0 flex-1 justify-center overflow-auto rounded-lg bg-gray-50 p-3">
                <img src={previewBlobUrl} alt={previewData.fileName} className="max-h-full max-w-full object-contain"/>
              </div>);
        }
        if (previewData.type === 'pdf' && previewBlobUrl) {
            return <iframe title={previewData.fileName} src={previewBlobUrl} className="min-h-0 flex-1 rounded-lg border border-gray-200"/>;
        }
        return <Alert severity="info">{previewData.message || 'Format file ini belum bisa ditampilkan langsung.'}</Alert>;
    };
    return (<AdminShell title="Project Review" description="Download and evaluate project submissions." icon={<FolderOpen className="h-6 w-6"/>}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 mb-3">
          <AdminStatCard label="Pending Review" value={projects.filter((project) => project.status === 'pending').length} icon={<FileArchive className="h-5 w-5"/>} tone="amber"/>
          <AdminStatCard label="Graded" value={projects.filter((project) => project.status === 'graded').length} icon={<Save className="h-5 w-5"/>} tone="green"/>
          <AdminStatCard label="Total Projects" value={projects.length} icon={<FolderOpen className="h-5 w-5"/>}/>
        </div>

        <TableContainer component={Paper} sx={adminTableSx}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                <TableCell>Participant</TableCell>
                <TableCell>Theme</TableCell>
                <TableCell>Project Title</TableCell>
                <TableCell>File</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell align="center">Score</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center" sx={{ width: 132, minWidth: 132 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {projects.map((project) => (<TableRow key={project.id} hover>
                  <TableCell>
                    <div>
                      <strong>{project.participantName}</strong>
                      <br />
                      <span className="text-sm text-gray-500">{project.participantId}</span>
                    </div>
                  </TableCell>
                  <TableCell>{project.theme}</TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      {project.projectTitle}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileArchive className="w-4 h-4 text-gray-500"/>
                      <div>
                        <div className="text-sm">{project.fileName}</div>
                        <div className="text-xs text-gray-500">
                          {(project.fileSize / (1024 * 1024)).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{project.submittedAt}</div>
                  </TableCell>
                  <TableCell align="center">
                    {project.currentScore !== null ? (<strong className="text-green-600">{project.currentScore}/{project.maxScore}</strong>) : (<span className="text-gray-400">-</span>)}
                  </TableCell>
                  <TableCell>
                    <Chip label={project.status === 'pending' ? 'Pending' : 'Graded'} color={project.status === 'pending' ? 'warning' : 'success'} size="small"/>
                  </TableCell>
                  <TableCell align="center" sx={{ width: 132, minWidth: 132 }}>
                    <div className="flex items-center justify-center gap-1">
                      <Tooltip title="Preview file">
                        <IconButton size="small" onClick={() => handleOpenPreview(project)} sx={actionButtonSx}>
                          <Eye className="h-4 w-4"/>
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download file">
                        <IconButton size="small" onClick={() => handleDownload(project)} sx={actionButtonSx}>
                          <Download className="h-4 w-4"/>
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Review dan nilai">
                        <IconButton size="small" onClick={() => handleOpenDialog(project)} sx={actionButtonSx}>
                          <ClipboardCheck className="h-4 w-4"/>
                        </IconButton>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>))}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth PaperProps={{ sx: adminDialogPaperSx }}>
          <DialogTitle>Project Review</DialogTitle>
          <DialogContent>
            {selectedProject && (<div className="space-y-5 mt-3">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Participant</p>
                  <p className="text-gray-800">
                    <strong>{selectedProject.participantName}</strong> ({selectedProject.participantId})
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">Project Details</p>
                  <p className="text-gray-800 mb-1">
                    <strong>Theme:</strong> {selectedProject.theme}
                  </p>
                  <p className="text-gray-800 mb-1">
                    <strong>Title:</strong> {selectedProject.projectTitle}
                  </p>
                  <p className="text-gray-800 mb-1">
                    <strong>Submitted:</strong> {selectedProject.submittedAt}
                  </p>
                </div>

                <Paper elevation={1} sx={{ p: 3, backgroundColor: '#fafafa' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <FileArchive className="w-8 h-8 text-gray-600"/>
                    <div>
                      <p className="text-gray-800">
                        <strong>{selectedProject.fileName}</strong>
                      </p>
                      <p className="text-sm text-gray-600">
                        {(selectedProject.fileSize / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outlined" startIcon={<Eye />} onClick={() => handleOpenPreview(selectedProject)} sx={secondaryButtonSx}>
                      Preview Project Files
                    </Button>
                    <Button variant="outlined" startIcon={<Download />} onClick={() => handleDownload(selectedProject)} sx={secondaryButtonSx}>
                      Download Project Files
                    </Button>
                  </div>
                </Paper>

                <div>
                  <p className="text-sm text-gray-600 mb-2">Score (out of {selectedProject.maxScore})</p>
                  <TextField fullWidth size="small" type="number" value={score} onChange={(e) => setScore(Math.min(Number(e.target.value), selectedProject.maxScore))} inputProps={{ min: 0, max: selectedProject.maxScore }} sx={adminFieldSx}/>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-2">Quality Rating</p>
                  <Rating size="large"/>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-2">Feedback (Optional)</p>
                  <TextField fullWidth size="small" multiline rows={4} placeholder="Provide detailed feedback on the project..." value={feedback} onChange={(e) => setFeedback(e.target.value)} sx={adminFieldSx}/>
                </div>
              </div>)}
          </DialogContent>
          <DialogActions sx={adminDialogActionsSx}>
            <Button onClick={handleCloseDialog} sx={secondaryButtonSx}>
              Cancel
            </Button>
            <Button onClick={handleSaveGrade} variant="contained" startIcon={<Save />} sx={{
            ...primaryButtonSx,
            background: 'linear-gradient(135deg, #16a34a 0%, #0f8f63 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #15803d 0%, #0b7651 100%)' },
        }}>
              Save Grade
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={previewOpen} onClose={handleClosePreview} maxWidth={false} PaperProps={{ sx: {
            ...adminDialogPaperSx,
            width: 'min(1080px, calc(100vw - 20px))',
            height: 'calc(100vh - 12px)',
            maxHeight: 'calc(100vh - 12px)',
        } }}>
          <DialogTitle sx={{ px: 3, py: 2 }}>
            <div className="flex items-center gap-2">
              {previewData?.type === 'image' ? <ImageIcon className="h-5 w-5"/> : <FileText className="h-5 w-5"/>}
              <span>Project File Preview</span>
            </div>
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', px: 3, py: 1 }}>
            <div className="mb-3 rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-sm text-gray-500">File</p>
              <p className="break-all text-gray-800"><strong>{previewProject?.fileName}</strong></p>
              {previewProject?.fileSize ? <p className="text-sm text-gray-600">{formatBytes(previewProject.fileSize)}</p> : null}
            </div>
            {renderPreviewContent()}
          </DialogContent>
          <DialogActions sx={{ ...adminDialogActionsSx, py: 2 }}>
            {previewProject && (<Button onClick={() => handleDownload(previewProject)} startIcon={<Download />} sx={secondaryButtonSx}>
                Download
              </Button>)}
            <Button onClick={handleClosePreview} sx={secondaryButtonSx}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
    </AdminShell>);
}
