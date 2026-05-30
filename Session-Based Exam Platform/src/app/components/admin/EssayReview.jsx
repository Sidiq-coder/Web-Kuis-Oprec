import { useEffect, useState } from 'react';
import { Paper, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip, Rating, } from '@mui/material';
import { Eye, Save, FileText } from 'lucide-react';
import { apiGet, apiPatch } from '../../utils/api';
import AdminShell, { actionButtonSx, AdminStatCard, adminDialogActionsSx, adminDialogPaperSx, adminFieldSx, adminTableSx, primaryButtonSx, secondaryButtonSx } from './AdminShell';
export default function EssayReview() {
    const [essays, setEssays] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedEssay, setSelectedEssay] = useState(null);
    const [score, setScore] = useState(0);
    const [feedback, setFeedback] = useState('');
    useEffect(() => {
        apiGet('/api/admin/essay-reviews', true).then((data) => setEssays(data));
    }, []);
    const handleOpenDialog = (essay) => {
        setSelectedEssay(essay);
        setScore(essay.currentScore || 0);
        setFeedback('');
        setDialogOpen(true);
    };
    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedEssay(null);
        setScore(0);
        setFeedback('');
    };
    const handleSaveGrade = async () => {
        if (!selectedEssay)
            return;
        await apiPatch(`/api/admin/essay-reviews/${selectedEssay.id}`, { score, feedback }, true);
        setEssays((prev) => prev.map((essay) => essay.id === selectedEssay.id
            ? { ...essay, currentScore: score, status: 'graded', feedback }
            : essay));
        handleCloseDialog();
    };
    return (<AdminShell title="Essay Review" description="Grade and provide feedback on essay submissions." icon={<FileText className="h-6 w-6"/>}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 mb-3">
          <AdminStatCard label="Pending Review" value={essays.filter((essay) => essay.status === 'pending').length} icon={<FileText className="h-5 w-5"/>} tone="amber"/>
          <AdminStatCard label="Graded" value={essays.filter((essay) => essay.status === 'graded').length} icon={<Save className="h-5 w-5"/>} tone="green"/>
          <AdminStatCard label="Total Essays" value={essays.length} icon={<FileText className="h-5 w-5"/>}/>
        </div>

        <TableContainer component={Paper} sx={adminTableSx}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                <TableCell>Participant</TableCell>
                <TableCell>Theme</TableCell>
                <TableCell>Question</TableCell>
                <TableCell align="center">Max Score</TableCell>
                <TableCell align="center">Current Score</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {essays.map((essay) => (<TableRow key={essay.id} hover>
                  <TableCell>
                    <div>
                      <strong>{essay.participantName}</strong>
                      <br />
                      <span className="text-sm text-gray-500">{essay.participantId}</span>
                    </div>
                  </TableCell>
                  <TableCell>{essay.theme}</TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      {essay.question.length > 60 ? essay.question.substring(0, 60) + '...' : essay.question}
                    </div>
                  </TableCell>
                  <TableCell align="center">
                    <strong>{essay.maxScore}</strong>
                  </TableCell>
                  <TableCell align="center">
                    {essay.currentScore !== null ? (<strong className="text-green-600">{essay.currentScore}</strong>) : (<span className="text-gray-400">-</span>)}
                  </TableCell>
                  <TableCell>
                    <Chip label={essay.status === 'pending' ? 'Pending' : 'Graded'} color={essay.status === 'pending' ? 'warning' : 'success'} size="small"/>
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" startIcon={<Eye className="w-4 h-4"/>} onClick={() => handleOpenDialog(essay)} sx={actionButtonSx}>
                      Review
                    </Button>
                  </TableCell>
                </TableRow>))}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth PaperProps={{ sx: adminDialogPaperSx }}>
          <DialogTitle>Essay Review</DialogTitle>
          <DialogContent>
            {selectedEssay && (<div className="space-y-5 mt-3">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Participant</p>
                  <p className="text-gray-800">
                    <strong>{selectedEssay.participantName}</strong> ({selectedEssay.participantId})
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">Question</p>
                  <p className="text-gray-800">{selectedEssay.question}</p>
                  <p className="text-sm text-gray-600 mt-2">Max Score: {selectedEssay.maxScore} points</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-2">Answer</p>
                  <Paper elevation={1} sx={{ p: 3, backgroundColor: '#fafafa' }}>
                    <p className="text-gray-800 whitespace-pre-wrap">{selectedEssay.answer}</p>
                  </Paper>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-2">Score (out of {selectedEssay.maxScore})</p>
                  <TextField fullWidth size="small" type="number" value={score} onChange={(e) => setScore(Math.min(Number(e.target.value), selectedEssay.maxScore))} inputProps={{ min: 0, max: selectedEssay.maxScore }} sx={adminFieldSx}/>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-2">Quality Rating</p>
                  <Rating size="large"/>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-2">Feedback (Optional)</p>
                  <TextField fullWidth size="small" multiline rows={4} placeholder="Provide feedback to the participant..." value={feedback} onChange={(e) => setFeedback(e.target.value)} sx={adminFieldSx}/>
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
