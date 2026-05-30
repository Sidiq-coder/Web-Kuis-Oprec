import { useEffect, useState } from 'react';
import { Paper, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip, Rating, } from '@mui/material';
import { Download, Eye, Save, FileArchive, FolderOpen } from 'lucide-react';
import { apiGet, apiPatch, getApiBaseUrl } from '../../utils/api';
import AdminShell, { actionButtonSx, AdminStatCard, adminDialogActionsSx, adminDialogPaperSx, adminFieldSx, adminTableSx, primaryButtonSx, secondaryButtonSx } from './AdminShell';
export default function ProjectReview() {
    const [projects, setProjects] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
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
                <TableCell align="right">Actions</TableCell>
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
                  <TableCell align="right">
                    <Button size="small" startIcon={<Download className="w-4 h-4"/>} onClick={() => handleDownload(project)} sx={{ ...actionButtonSx, mr: 1 }}>
                      Download
                    </Button>
                    <Button size="small" startIcon={<Eye className="w-4 h-4"/>} onClick={() => handleOpenDialog(project)} sx={actionButtonSx}>
                      Review
                    </Button>
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
                  <Button variant="outlined" startIcon={<Download />} onClick={() => handleDownload(selectedProject)} sx={secondaryButtonSx}>
                    Download Project Files
                  </Button>
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
    </AdminShell>);
}
