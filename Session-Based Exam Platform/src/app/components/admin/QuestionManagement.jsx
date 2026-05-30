import { useEffect, useState } from 'react';
import { Paper, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, Chip, } from '@mui/material';
import { Plus, Edit, Trash2, FileQuestion } from 'lucide-react';
import { apiDelete, apiGet, apiPatch, apiPost } from '../../utils/api';
import TechConfirmDialog from '../ui/TechConfirmDialog';
import AdminShell, { actionButtonSx, adminDialogActionsSx, adminDialogPaperSx, adminFieldSx, adminPageSx, adminSelectSx, adminTableSx, primaryButtonSx, secondaryButtonSx } from './AdminShell';
export default function QuestionManagement() {
    const [questions, setQuestions] = useState([]);
    const [themes, setThemes] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedTheme, setSelectedTheme] = useState('web-dev');
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [formData, setFormData] = useState({
        themeId: 'web-dev',
        type: 'multiple-choice',
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        weight: 10,
    });
    useEffect(() => {
        apiGet('/api/themes', true)
            .then((data) => {
            setThemes(data);
            if (data.length > 0) {
                setSelectedTheme(data[0].id);
                setFormData((prev) => ({ ...prev, themeId: data[0].id }));
            }
        })
            .finally(() => setIsLoading(false));
    }, []);
    useEffect(() => {
        if (!selectedTheme)
            return;
        apiGet(`/api/themes/${selectedTheme}/questions`, true).then((data) => {
            setQuestions(data);
        });
    }, [selectedTheme]);
    const handleOpenDialog = (question) => {
        if (question) {
            setEditingQuestion(question);
            setFormData({
                themeId: question.themeId,
                type: question.type,
                question: question.question,
                options: question.options || ['', '', '', ''],
                correctAnswer: question.correctAnswer || 0,
                weight: question.weight,
            });
        }
        else {
            setEditingQuestion(null);
            setFormData({
                themeId: selectedTheme,
                type: 'multiple-choice',
                question: '',
                options: ['', '', '', ''],
                correctAnswer: 0,
                weight: 10,
            });
        }
        setDialogOpen(true);
    };
    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingQuestion(null);
    };
    const handleSave = async () => {
        const payload = {
            themeId: formData.themeId,
            type: formData.type,
            question: formData.question,
            options: formData.type === 'multiple-choice' ? formData.options : undefined,
            correctAnswer: formData.type === 'multiple-choice' ? formData.correctAnswer : undefined,
            weight: formData.weight,
        };
        if (editingQuestion) {
            await apiPatch(`/api/admin/questions/${editingQuestion.id}`, payload, true);
        }
        else {
            await apiPost('/api/admin/questions', payload, true);
        }
        const refreshed = await apiGet(`/api/themes/${selectedTheme}/questions`, true);
        setQuestions(refreshed);
        handleCloseDialog();
    };
    const handleDelete = async (_themeId, questionId) => {
        await apiDelete(`/api/admin/questions/${questionId}`, true);
        setQuestions(questions.filter((q) => q.id !== questionId));
        setDeleteTarget(null);
    };
    const currentQuestions = questions || [];
    return (<AdminShell title="Question Management" description="Create and manage exam questions." icon={<FileQuestion className="h-6 w-6"/>} actions={<Button variant="contained" startIcon={<Plus />} onClick={() => handleOpenDialog()} sx={primaryButtonSx}>
        Add Question
      </Button>}>
      <TechConfirmDialog open={!!deleteTarget} title="Delete this question?" description="This question will be removed from the selected theme and will no longer appear in participant exams." confirmLabel="Delete Question" cancelLabel="Cancel" intent="danger" onCancel={() => setDeleteTarget(null)} onConfirm={() => handleDelete(selectedTheme, deleteTarget)}/>

        <Paper elevation={0} sx={{ ...adminPageSx, p: 2, mb: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Select Theme</InputLabel>
            <Select value={selectedTheme} onChange={(e) => setSelectedTheme(e.target.value)} label="Select Theme" sx={adminSelectSx}>
              {themes.map((theme) => (<MenuItem key={theme.id} value={theme.id}>
                  {theme.icon} {theme.name}
                </MenuItem>))}
            </Select>
          </FormControl>
        </Paper>

        <TableContainer component={Paper} sx={adminTableSx}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                <TableCell>Type</TableCell>
                <TableCell>Question</TableCell>
                <TableCell align="center">Weight</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {currentQuestions.map((question) => (<TableRow key={question.id} hover>
                  <TableCell>
                    <Chip label={question.type === 'multiple-choice' ? 'Multiple Choice' : 'Essay'} color={question.type === 'multiple-choice' ? 'primary' : 'secondary'} size="small"/>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-md">
                      {question.question.length > 100
                ? question.question.substring(0, 100) + '...'
                : question.question}
                    </div>
                  </TableCell>
                  <TableCell align="center">
                    <strong>{question.weight}</strong>
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" startIcon={<Edit className="w-4 h-4"/>} onClick={() => handleOpenDialog(question)} sx={{ ...actionButtonSx, mr: 1 }}>
                      Edit
                    </Button>
                    <Button size="small" color="error" startIcon={<Trash2 className="w-4 h-4"/>} onClick={() => setDeleteTarget(question.id)} sx={actionButtonSx}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>))}
              {!isLoading && currentQuestions.length === 0 && (<TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                    <p className="text-gray-500">No questions found for this theme</p>
                  </TableCell>
                </TableRow>)}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth PaperProps={{ sx: adminDialogPaperSx }}>
          <DialogTitle>{editingQuestion ? 'Edit Question' : 'Add New Question'}</DialogTitle>
          <DialogContent>
            <div className="space-y-5 mt-3">
              <FormControl fullWidth size="small">
                <InputLabel>Theme</InputLabel>
                <Select value={formData.themeId} onChange={(e) => setFormData({ ...formData, themeId: e.target.value })} label="Theme" sx={adminSelectSx}>
                  {themes.map((theme) => (<MenuItem key={theme.id} value={theme.id}>
                      {theme.icon} {theme.name}
                    </MenuItem>))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Question Type</InputLabel>
                <Select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} label="Question Type" sx={adminSelectSx}>
                  <MenuItem value="multiple-choice">Multiple Choice</MenuItem>
                  <MenuItem value="essay">Essay</MenuItem>
                </Select>
              </FormControl>

              <TextField fullWidth size="small" label="Question" multiline rows={3} value={formData.question} onChange={(e) => setFormData({ ...formData, question: e.target.value })} sx={adminFieldSx} InputLabelProps={{ shrink: true }}/>

              {formData.type === 'multiple-choice' && (<>
                  {formData.options.map((option, index) => (<TextField key={index} fullWidth size="small" label={`Option ${index + 1}`} value={option} sx={adminFieldSx} InputLabelProps={{ shrink: true }} onChange={(e) => {
                    const newOptions = [...formData.options];
                    newOptions[index] = e.target.value;
                    setFormData({ ...formData, options: newOptions });
                }}/>))}

                  <FormControl fullWidth size="small">
                    <InputLabel>Correct Answer</InputLabel>
                    <Select value={formData.correctAnswer} onChange={(e) => setFormData({ ...formData, correctAnswer: Number(e.target.value) })} label="Correct Answer" sx={adminSelectSx}>
                      {formData.options.map((option, index) => (<MenuItem key={index} value={index}>
                          Option {index + 1}: {option}
                        </MenuItem>))}
                    </Select>
                  </FormControl>
                </>)}

              <TextField fullWidth size="small" type="number" label="Weight (Points)" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })} sx={adminFieldSx} InputLabelProps={{ shrink: true }}/>
            </div>
          </DialogContent>
          <DialogActions sx={adminDialogActionsSx}>
            <Button onClick={handleCloseDialog} sx={secondaryButtonSx}>
              Cancel
            </Button>
            <Button onClick={handleSave} variant="contained" disabled={!formData.question || (formData.type === 'multiple-choice' && formData.options.some((o) => !o))} sx={{
            ...primaryButtonSx,
        }}>
              Save
            </Button>
          </DialogActions>
        </Dialog>
    </AdminShell>);
}
