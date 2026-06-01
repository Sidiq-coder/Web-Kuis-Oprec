import { useEffect, useState } from 'react';
import { Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, InputLabel, MenuItem, Paper, Select, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from '@mui/material';
import { Edit, FileQuestion, Minus, Palette, Plus, Trash2 } from 'lucide-react';
import { apiDelete, apiGet, apiPatch, apiPost } from '../../utils/api';
import TechConfirmDialog from '../ui/TechConfirmDialog';
import ThemeIcon from '../ui/ThemeIcon';
import AdminShell, { actionButtonSx, adminDialogActionsSx, adminDialogPaperSx, adminFieldSx, adminPageSx, adminSelectSx, adminTableSx, primaryButtonSx, secondaryButtonSx } from './AdminShell';

export default function QuizSetupManagement() {
    const [themes, setThemes] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [selectedTheme, setSelectedTheme] = useState('');
    const [themeDialogOpen, setThemeDialogOpen] = useState(false);
    const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
    const [editingTheme, setEditingTheme] = useState(null);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [themeForm, setThemeForm] = useState({ name: '', description: '', icon: '', isActive: true, randomizeItems: true, itemLimit: 0, durationMinutes: 60 });
    const [questionForm, setQuestionForm] = useState({
        themeId: '',
        type: 'multiple-choice',
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        correctAnswers: [],
        weight: 10,
        attachmentFile: null,
        removeAttachment: false,
    });

    const loadThemes = async () => {
        const data = await apiGet('/api/admin/themes', true);
        setThemes(data);
        const nextTheme = selectedTheme || data[0]?.id || '';
        setSelectedTheme(nextTheme);
        setQuestionForm((prev) => ({ ...prev, themeId: nextTheme }));
        return nextTheme;
    };

    const loadQuestions = async (themeId) => {
        if (!themeId) {
            setQuestions([]);
            return;
        }
        const data = await apiGet(`/api/themes/${themeId}/questions`, true);
        setQuestions(data);
    };

    useEffect(() => {
        loadThemes()
            .then((themeId) => loadQuestions(themeId))
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => {
        loadQuestions(selectedTheme);
    }, [selectedTheme]);

    const openThemeDialog = (theme) => {
        setEditingTheme(theme || null);
        setThemeForm(theme ? { name: theme.name, description: theme.description, icon: theme.icon, isActive: theme.isActive !== false, randomizeItems: theme.randomizeItems !== false, itemLimit: theme.itemLimit || 0, durationMinutes: theme.durationMinutes || 60 } : { name: '', description: '', icon: '', isActive: true, randomizeItems: true, itemLimit: 0, durationMinutes: 60 });
        setThemeDialogOpen(true);
    };

    const openQuestionDialog = (question) => {
        setEditingQuestion(question || null);
        setQuestionForm(question
            ? {
                themeId: question.themeId,
                type: question.type,
                question: question.question,
                options: question.options || ['', '', '', ''],
                correctAnswer: question.correctAnswer || 0,
                correctAnswers: question.correctAnswers || [],
                weight: question.weight,
                attachmentFile: null,
                removeAttachment: false,
            }
            : {
                themeId: selectedTheme,
                type: 'multiple-choice',
                question: '',
                options: ['', '', '', ''],
                correctAnswer: 0,
                correctAnswers: [],
                weight: 10,
                attachmentFile: null,
                removeAttachment: false,
            });
        setQuestionDialogOpen(true);
    };

    const handleThemeImageChange = (event) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = () => {
            setThemeForm((prev) => ({ ...prev, icon: String(reader.result || '') }));
        };
        reader.readAsDataURL(file);
    };

    const addOption = () => {
        setQuestionForm((prev) => ({
            ...prev,
            options: [...prev.options, ''],
        }));
    };

    const removeOption = (index) => {
        setQuestionForm((prev) => {
            if (prev.options.length <= 2) {
                return prev;
            }
            const options = prev.options.filter((_, optionIndex) => optionIndex !== index);
            const correctAnswer = prev.correctAnswer === index
                ? 0
                : prev.correctAnswer > index
                    ? prev.correctAnswer - 1
                    : Math.min(prev.correctAnswer, options.length - 1);
            const correctAnswers = (prev.correctAnswers || [])
                .filter((answerIndex) => answerIndex !== index)
                .map((answerIndex) => answerIndex > index ? answerIndex - 1 : answerIndex);
            return {
                ...prev,
                options,
                correctAnswer,
                correctAnswers,
            };
        });
    };

    const saveTheme = async () => {
        if (editingTheme) {
            await apiPatch(`/api/admin/themes/${editingTheme.id}`, themeForm, true);
        }
        else {
            await apiPost('/api/admin/themes', themeForm, true);
        }
        setThemeDialogOpen(false);
        const themeId = await loadThemes();
        await loadQuestions(themeId);
    };

    const saveQuestion = async () => {
        const payload = {
            themeId: questionForm.themeId,
            type: questionForm.type,
            question: questionForm.question,
            options: questionForm.type === 'multiple-choice' || questionForm.type === 'multiple-answer' ? questionForm.options : undefined,
            correctAnswer: questionForm.type === 'multiple-choice' ? questionForm.correctAnswer : undefined,
            correctAnswers: questionForm.type === 'multiple-answer' ? questionForm.correctAnswers : undefined,
            weight: questionForm.weight,
            removeAttachment: questionForm.removeAttachment,
        };
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
            if (value !== undefined)
                formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
        });
        if (questionForm.attachmentFile)
            formData.append('attachment', questionForm.attachmentFile);
        if (editingQuestion) {
            await apiPatch(`/api/admin/questions/${editingQuestion.id}`, formData, true);
        }
        else {
            await apiPost('/api/admin/questions', formData, true);
        }
        setQuestionDialogOpen(false);
        await loadQuestions(selectedTheme);
    };

    const confirmDelete = async () => {
        if (!deleteTarget)
            return;
        if (deleteTarget.type === 'theme') {
            await apiDelete(`/api/admin/themes/${deleteTarget.id}?force=true`, true);
            const themeId = await loadThemes();
            await loadQuestions(themeId);
        }
        else {
            await apiDelete(`/api/admin/questions/${deleteTarget.id}`, true);
            await loadQuestions(selectedTheme);
        }
        setDeleteTarget(null);
    };

    return (<AdminShell title="Quiz Setup" description="Kelola tema kuis dan soal dalam satu halaman." icon={<Palette className="h-6 w-6"/>}>
      <TechConfirmDialog open={!!deleteTarget} title={deleteTarget?.type === 'theme' ? 'Delete this quiz theme?' : 'Delete this question?'} description={deleteTarget?.type === 'theme'
        ? 'Tema kuis akan dihapus bersama soal yang terkait. Referensi peserta akan dibersihkan.'
        : 'Soal ini akan dihapus dari tema kuis terpilih.'} confirmLabel="Delete" cancelLabel="Cancel" intent="danger" onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete}/>

      <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <Paper elevation={0} sx={{ ...adminPageSx, p: 2 }}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-xs font-semibold text-[#1e5ba8]">quiz.themes</p>
              <h2 className="text-lg font-semibold text-slate-950">Tema Kuis</h2>
            </div>
            <Button size="small" startIcon={<Plus />} onClick={() => openThemeDialog()} sx={actionButtonSx}>Tambah Tema</Button>
          </div>
          <TableContainer component={Paper} sx={adminTableSx}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Theme</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {themes.map((theme) => (<TableRow key={theme.id} hover selected={theme.id === selectedTheme} onClick={() => setSelectedTheme(theme.id)} sx={{ cursor: 'pointer' }}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#d7ecff] text-[#1e5ba8]">
                        <ThemeIcon value={theme.icon} className="h-8 w-8" fallbackClassName="h-5 w-5"/>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-950">{theme.name}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <Chip label={theme.isActive === false ? 'Nonaktif' : 'Aktif'} size="small" color={theme.isActive === false ? 'default' : 'success'} sx={{ height: 20, fontSize: 11 }}/>
                          <Chip label={theme.randomizeItems === false ? 'Urut' : 'Acak'} size="small" color={theme.randomizeItems === false ? 'default' : 'secondary'} variant="outlined" sx={{ height: 20, fontSize: 11 }}/>
                          <Chip label={theme.itemLimit > 0 ? `${theme.itemLimit} soal` : 'Semua soal'} size="small" color="info" variant="outlined" sx={{ height: 20, fontSize: 11 }}/>
                          <Chip label={`${theme.durationMinutes || 60} menit`} size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: 11 }}/>
                          <p className="line-clamp-1 text-xs text-slate-500">{theme.description}</p>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" startIcon={<Edit className="h-4 w-4"/>} onClick={(event) => {
                event.stopPropagation();
                openThemeDialog(theme);
            }} sx={actionButtonSx}>Edit</Button>
                    <Button size="small" color="error" startIcon={<Trash2 className="h-4 w-4"/>} onClick={(event) => {
                event.stopPropagation();
                setDeleteTarget({ type: 'theme', id: theme.id });
            }} sx={actionButtonSx}>Delete</Button>
                  </TableCell>
                </TableRow>))}
                {!isLoading && themes.length === 0 && <TableRow><TableCell colSpan={2} align="center" sx={{ py: 5 }}>Belum ada tema kuis.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Paper elevation={0} sx={{ ...adminPageSx, p: 2 }}>
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-xs font-semibold text-[#1e5ba8]">quiz.questions</p>
              <h2 className="text-lg font-semibold text-slate-950">Soal Kuis</h2>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel>Theme</InputLabel>
                <Select value={selectedTheme} onChange={(e) => setSelectedTheme(e.target.value)} label="Theme" sx={adminSelectSx}>
                  {themes.map((theme) => <MenuItem key={theme.id} value={theme.id}><span className="mr-2 inline-flex h-6 w-6 items-center justify-center"><ThemeIcon value={theme.icon} className="h-6 w-6" fallbackClassName="h-4 w-4"/></span>{theme.name}</MenuItem>)}
                </Select>
              </FormControl>
              <Button variant="contained" size="small" startIcon={<FileQuestion />} onClick={() => openQuestionDialog()} disabled={!selectedTheme} sx={primaryButtonSx}>Buat Kuis</Button>
            </div>
          </div>
          <TableContainer component={Paper} sx={adminTableSx}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Question</TableCell>
                  <TableCell align="center">Weight</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {questions.map((question) => (<TableRow key={question.id} hover>
                  <TableCell><Chip label={question.type === 'multiple-answer' ? 'Multiple Answers' : question.type === 'multiple-choice' ? 'Multiple Choice' : 'Essay'} color={question.type === 'multiple-answer' ? 'warning' : 'default'} size="small"/></TableCell>
                  <TableCell><div className="max-w-md line-clamp-2">{question.question}</div>{question.attachmentUrl && <Chip label="Ada lampiran" size="small" color="info" variant="outlined" sx={{ mt: 0.75, height: 20, fontSize: 11 }}/>}</TableCell>
                  <TableCell align="center"><strong>{question.weight}</strong></TableCell>
                  <TableCell align="right">
                    <Button size="small" startIcon={<Edit className="h-4 w-4"/>} onClick={() => openQuestionDialog(question)} sx={actionButtonSx}>Edit</Button>
                    <Button size="small" color="error" startIcon={<Trash2 className="h-4 w-4"/>} onClick={() => setDeleteTarget({ type: 'question', id: question.id })} sx={actionButtonSx}>Delete</Button>
                  </TableCell>
                </TableRow>))}
                {!isLoading && questions.length === 0 && <TableRow><TableCell colSpan={4} align="center" sx={{ py: 5 }}>Belum ada soal untuk tema ini.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </div>

      <Dialog open={themeDialogOpen} onClose={() => setThemeDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: adminDialogPaperSx }}>
        <DialogTitle>{editingTheme ? 'Edit Tema Kuis' : 'Tambah Tema Kuis'}</DialogTitle>
        <DialogContent><div className="mt-3 space-y-5">
          <TextField fullWidth size="small" label="Nama Tema" value={themeForm.name} onChange={(e) => setThemeForm({ ...themeForm, name: e.target.value })} sx={adminFieldSx} InputLabelProps={{ shrink: true }}/>
          <TextField fullWidth size="small" label="Deskripsi" multiline rows={3} value={themeForm.description} onChange={(e) => setThemeForm({ ...themeForm, description: e.target.value })} sx={adminFieldSx} InputLabelProps={{ shrink: true }}/>
          <TextField fullWidth size="small" type="number" label="Durasi Kuis (menit)" inputProps={{ min: 1 }} value={themeForm.durationMinutes} onChange={(e) => setThemeForm({ ...themeForm, durationMinutes: Number(e.target.value) })} sx={adminFieldSx} InputLabelProps={{ shrink: true }}/>
          <TextField fullWidth size="small" type="number" label="Jumlah Soal Ditampilkan" helperText="Isi 0 untuk menampilkan semua soal pada tema ini." inputProps={{ min: 0 }} value={themeForm.itemLimit} onChange={(e) => setThemeForm({ ...themeForm, itemLimit: Math.max(Number(e.target.value), 0) })} sx={adminFieldSx} InputLabelProps={{ shrink: true }}/>
          <div className="grid gap-2">
            <FormControlLabel sx={{ m: 0 }} control={<Switch checked={themeForm.isActive} onChange={(e) => setThemeForm({ ...themeForm, isActive: e.target.checked })}/>} label={themeForm.isActive ? 'Tema aktif dan tampil ke peserta' : 'Tema nonaktif dan disembunyikan dari peserta'}/>
            <FormControlLabel sx={{ m: 0 }} control={<Switch checked={themeForm.randomizeItems} onChange={(e) => setThemeForm({ ...themeForm, randomizeItems: e.target.checked })}/>} label={themeForm.randomizeItems ? 'Soal diacak untuk setiap peserta' : 'Soal tampil sesuai urutan'}/>
          </div>
          <div className="rounded-lg border border-[#1e5ba8]/20 bg-white/70 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[#d7ecff] text-[#1e5ba8]">
                <ThemeIcon value={themeForm.icon} className="h-11 w-11" fallbackClassName="h-6 w-6"/>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-950">Gambar Tema <span className="font-normal text-slate-500">(opsional)</span></p>
                <p className="text-xs leading-5 text-slate-500">Upload gambar kecil untuk ikon tema. Jika kosong, sistem memakai ikon default.</p>
              </div>
              <Button component="label" variant="outlined" sx={secondaryButtonSx}>
                Upload
                <input hidden type="file" accept="image/*" onChange={handleThemeImageChange}/>
              </Button>
            </div>
            {themeForm.icon && <Button size="small" color="error" onClick={() => setThemeForm({ ...themeForm, icon: '' })} sx={{ mt: 1.5, textTransform: 'none' }}>Hapus gambar</Button>}
          </div>
        </div></DialogContent>
        <DialogActions sx={adminDialogActionsSx}><Button onClick={() => setThemeDialogOpen(false)} sx={secondaryButtonSx}>Cancel</Button><Button onClick={saveTheme} variant="contained" disabled={!themeForm.name || !themeForm.description || themeForm.durationMinutes <= 0} sx={primaryButtonSx}>Save</Button></DialogActions>
      </Dialog>

      <Dialog open={questionDialogOpen} onClose={() => setQuestionDialogOpen(false)} maxWidth="lg" fullWidth PaperProps={{
        sx: {
            ...adminDialogPaperSx,
            overflow: 'hidden',
        },
    }}>
        <DialogContent sx={{ p: 0 }}>
          <div className="relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#164a8f] via-[#1e5ba8] to-[#38bdf8]"/>
            <div className="absolute right-6 top-6 grid grid-cols-3 gap-1 opacity-45">
              {Array.from({ length: 9 }).map((_, index) => <div key={index} className="h-3 w-3 rounded-[3px] border border-[#1e5ba8]/25 bg-[#1e5ba8]/12"/>)}
            </div>
            <div className="absolute bottom-5 right-8 font-mono text-4xl font-semibold text-[#1e5ba8]/10">question.build()</div>

            <div className="relative bg-gradient-to-br from-[#dceeff] via-[#eef7ff] to-[#cfe7ff] p-4 sm:p-5">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1e5ba8] text-white shadow-lg shadow-blue-900/20">
                  <FileQuestion className="h-5 w-5"/>
                </div>
                <div>
                  <div className="mb-1 inline-flex rounded-md border border-[#1e5ba8]/20 bg-[#1e5ba8]/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-[#1e5ba8]">
                    quiz.question.form
                  </div>
                  <h2 className="text-xl font-semibold text-slate-950">{editingQuestion ? 'Edit Soal Kuis' : 'Buat Soal Kuis'}</h2>
                  <p className="mt-0.5 text-sm leading-5 text-slate-600">Susun soal, opsi jawaban, kunci, dan bobot.</p>
                </div>
              </div>

              <div className="grid min-w-0 gap-3 lg:grid-cols-[0.78fr_1.22fr]">
                <div className="min-w-0 rounded-lg border border-[#1e5ba8]/24 bg-[#e7f3ff]/90 p-3 shadow-sm">
                  <p className="mb-2 font-mono text-xs font-semibold text-[#1e5ba8]">config</p>
                  <div className="grid gap-3">
                    <FormControl fullWidth size="small">
                      <InputLabel>Theme</InputLabel>
                      <Select value={questionForm.themeId} onChange={(e) => setQuestionForm({ ...questionForm, themeId: e.target.value })} label="Theme" sx={adminSelectSx}>
                        {themes.map((theme) => <MenuItem key={theme.id} value={theme.id}><span className="mr-2 inline-flex h-6 w-6 items-center justify-center"><ThemeIcon value={theme.icon} className="h-6 w-6" fallbackClassName="h-4 w-4"/></span>{theme.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <FormControl fullWidth size="small">
                      <InputLabel>Question Type</InputLabel>
                      <Select value={questionForm.type} onChange={(e) => setQuestionForm({ ...questionForm, type: e.target.value })} label="Question Type" sx={adminSelectSx}>
                        <MenuItem value="multiple-choice">Multiple Choice</MenuItem>
                        <MenuItem value="multiple-answer">Multiple Answers</MenuItem>
                        <MenuItem value="essay">Essay</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField fullWidth size="small" type="number" label="Weight" value={questionForm.weight} onChange={(e) => setQuestionForm({ ...questionForm, weight: Number(e.target.value) })} sx={adminFieldSx} InputLabelProps={{ shrink: true }}/>
                  </div>
                </div>

                <div className="min-w-0 rounded-lg border border-[#1e5ba8]/24 bg-[#eaf5ff]/95 p-3 shadow-sm">
                  <p className="mb-2 font-mono text-xs font-semibold text-[#1e5ba8]">content</p>
                  <TextField fullWidth size="small" label="Question" multiline rows={3} value={questionForm.question} onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })} sx={adminFieldSx} InputLabelProps={{ shrink: true }}/>
                  <div className="rounded-lg border border-[#1e5ba8]/20 bg-white/70 p-3">
                    <p className="text-sm font-semibold text-slate-950">Lampiran soal <span className="font-normal text-slate-500">(opsional, maks. 10 MB)</span></p>
                    <p className="mb-2 text-xs text-slate-500">Tambahkan gambar atau file pendukung yang dapat dibuka peserta.</p>
                    <Button component="label" variant="outlined" size="small" sx={secondaryButtonSx}>
                      Pilih File
                      <input hidden type="file" onChange={(event) => setQuestionForm({ ...questionForm, attachmentFile: event.target.files?.[0] || null, removeAttachment: false })}/>
                    </Button>
                    {questionForm.attachmentFile && <p className="mt-2 text-xs text-slate-600">{questionForm.attachmentFile.name}</p>}
                    {!questionForm.attachmentFile && editingQuestion?.attachmentName && !questionForm.removeAttachment && <p className="mt-2 text-xs text-slate-600">Saat ini: {editingQuestion.attachmentName}</p>}
                    {editingQuestion?.attachmentUrl && !questionForm.removeAttachment && <Button size="small" color="error" onClick={() => setQuestionForm({ ...questionForm, attachmentFile: null, removeAttachment: true })} sx={{ mt: 1, textTransform: 'none' }}>Hapus lampiran</Button>}
                  </div>

                  {(questionForm.type === 'multiple-choice' || questionForm.type === 'multiple-answer') && (<div className="mt-1">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">Answer Options</p>
                        <p className="text-xs text-slate-500">Minimal 2 opsi. Default 4 opsi.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md border border-[#1e5ba8]/16 bg-white/80 px-2 py-1 font-mono text-[11px] text-[#1e5ba8]">{questionForm.type === 'multiple-answer' ? 'select_multiple()' : 'select_correct()'}</span>
                        <Button size="small" startIcon={<Plus className="h-4 w-4"/>} onClick={addOption} sx={actionButtonSx}>Tambah</Button>
                      </div>
                    </div>
                    <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                      {questionForm.options.map((option, index) => <div key={index} className="flex min-w-0 items-start gap-1.5">
                        <TextField fullWidth size="small" multiline minRows={2} maxRows={5} label={`Option ${index + 1}`} value={option} onChange={(e) => {
                            const options = [...questionForm.options];
                            options[index] = e.target.value;
                            setQuestionForm({ ...questionForm, options });
                        }} sx={{
                            ...adminFieldSx,
                            flex: 1,
                            '& .MuiInputBase-input': {
                                whiteSpace: 'pre-wrap',
                                overflowWrap: 'anywhere',
                                lineHeight: 1.45,
                            },
                        }} InputLabelProps={{ shrink: true }}/>
                        <Button size="small" color="error" disabled={questionForm.options.length <= 2} onClick={() => removeOption(index)} sx={{
                            minWidth: 34,
                            width: 34,
                            height: 34,
                            mt: 0.35,
                            borderRadius: '8px',
                        }}>
                          <Minus className="h-4 w-4"/>
                        </Button>
                      </div>)}
                    </div>
                    {questionForm.type === 'multiple-choice' ? (<FormControl fullWidth size="small" sx={{ mt: 1.5 }}>
                      <InputLabel>Correct Answer</InputLabel>
                      <Select value={questionForm.correctAnswer} onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: Number(e.target.value) })} label="Correct Answer" sx={adminSelectSx} renderValue={(value) => {
                        const index = Number(value);
                        return `Option ${index + 1}: ${questionForm.options[index] || '-'}`;
                    }} MenuProps={{ PaperProps: { sx: { maxWidth: 640 } } }}>
                        {questionForm.options.map((option, index) => <MenuItem key={index} value={index}>
                          <span className="block max-w-full truncate">Option {index + 1}: {option || '-'}</span>
                        </MenuItem>)}
                      </Select>
                    </FormControl>) : (<div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="mb-2 text-sm font-semibold text-amber-900">Correct Answers</p>
                      <p className="mb-2 text-xs text-amber-700">Pilih lebih dari satu jawaban benar. Peserta harus memilih kombinasi yang tepat.</p>
                      <div className="grid gap-1 sm:grid-cols-2">
                        {questionForm.options.map((option, index) => (<FormControlLabel key={index} control={<Checkbox checked={(questionForm.correctAnswers || []).includes(index)} onChange={(event) => {
                            const correctAnswers = event.target.checked
                                ? [...(questionForm.correctAnswers || []), index].sort((a, b) => a - b)
                                : (questionForm.correctAnswers || []).filter((answerIndex) => answerIndex !== index);
                            setQuestionForm({ ...questionForm, correctAnswers });
                        }}/>} label={`Option ${index + 1}: ${option || '-'}`}/>))}
                      </div>
                    </div>)}
                  </div>)}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
        <DialogActions sx={{ ...adminDialogActionsSx, borderTop: '1px solid rgba(30, 91, 168, 0.12)', background: 'rgba(239, 247, 255, 0.8)' }}>
          <Button onClick={() => setQuestionDialogOpen(false)} sx={secondaryButtonSx}>Cancel</Button>
          <Button onClick={saveQuestion} variant="contained" disabled={!questionForm.themeId || !questionForm.question || ((questionForm.type === 'multiple-choice' || questionForm.type === 'multiple-answer') && questionForm.options.some((option) => !option)) || (questionForm.type === 'multiple-answer' && questionForm.correctAnswers.length < 2)} sx={primaryButtonSx}>Save</Button>
        </DialogActions>
      </Dialog>
    </AdminShell>);
}
