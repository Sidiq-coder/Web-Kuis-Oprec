import { useEffect, useState } from 'react';
import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, InputLabel, MenuItem, Paper, Select, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from '@mui/material';
import { Edit, FolderOpen, Layers3, Plus, Trash2 } from 'lucide-react';
import { apiDelete, apiGet, apiPatch, apiPost } from '../../utils/api';
import TechConfirmDialog from '../ui/TechConfirmDialog';
import ThemeIcon from '../ui/ThemeIcon';
import AdminShell, { actionButtonSx, adminDialogActionsSx, adminDialogPaperSx, adminFieldSx, adminPageSx, adminSelectSx, adminTableSx, primaryButtonSx, secondaryButtonSx } from './AdminShell';

export default function ProjectSetupManagement() {
    const [themes, setThemes] = useState([]);
    const [cases, setCases] = useState([]);
    const [selectedTheme, setSelectedTheme] = useState('');
    const [themeDialogOpen, setThemeDialogOpen] = useState(false);
    const [caseDialogOpen, setCaseDialogOpen] = useState(false);
    const [editingTheme, setEditingTheme] = useState(null);
    const [editingCase, setEditingCase] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [themeForm, setThemeForm] = useState({ name: '', description: '', icon: '', isActive: true, durationMinutes: 120 });
    const [caseForm, setCaseForm] = useState({
        themeId: '',
        title: '',
        description: '',
        requirementsText: '',
        allowedFormatsText: '',
        maxSize: 10,
    });

    const loadThemes = async () => {
        const data = await apiGet('/api/admin/project-themes', true);
        setThemes(data);
        const nextTheme = selectedTheme || data[0]?.id || '';
        setSelectedTheme(nextTheme);
        setCaseForm((prev) => ({ ...prev, themeId: nextTheme }));
        return nextTheme;
    };

    const loadCases = async (themeId) => {
        if (!themeId) {
            setCases([]);
            return;
        }
        const data = await apiGet(`/api/admin/project-cases?themeId=${encodeURIComponent(themeId)}`, true);
        setCases(data);
    };

    useEffect(() => {
        loadThemes()
            .then((themeId) => loadCases(themeId))
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => {
        loadCases(selectedTheme);
    }, [selectedTheme]);

    const parseList = (value) => value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);

    const openThemeDialog = (theme) => {
        setEditingTheme(theme || null);
        setThemeForm(theme ? { name: theme.name, description: theme.description, icon: theme.icon, isActive: theme.isActive !== false, durationMinutes: theme.durationMinutes || 120 } : { name: '', description: '', icon: '', isActive: true, durationMinutes: 120 });
        setThemeDialogOpen(true);
    };

    const openCaseDialog = (projectCase) => {
        setEditingCase(projectCase || null);
        setCaseForm(projectCase
            ? {
                themeId: projectCase.themeId,
                title: projectCase.title,
                description: projectCase.description,
                requirementsText: (projectCase.requirements || []).join('\n'),
                allowedFormatsText: (projectCase.allowedFormats || []).join(', '),
                maxSize: projectCase.maxSize || 10,
            }
            : {
                themeId: selectedTheme,
                title: '',
                description: '',
                requirementsText: '',
                allowedFormatsText: '',
                maxSize: 10,
            });
        setCaseDialogOpen(true);
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

    const saveTheme = async () => {
        if (editingTheme) {
            await apiPatch(`/api/admin/project-themes/${editingTheme.id}`, themeForm, true);
        }
        else {
            await apiPost('/api/admin/project-themes', themeForm, true);
        }
        setThemeDialogOpen(false);
        const themeId = await loadThemes();
        await loadCases(themeId);
    };

    const saveCase = async () => {
        const payload = {
            themeId: caseForm.themeId,
            title: caseForm.title.trim(),
            description: caseForm.description.trim(),
            requirements: parseList(caseForm.requirementsText),
            allowedFormats: parseList(caseForm.allowedFormatsText),
            maxSize: Number(caseForm.maxSize),
        };
        if (editingCase) {
            await apiPatch(`/api/admin/project-cases/${editingCase.id}`, payload, true);
        }
        else {
            await apiPost('/api/admin/project-cases', payload, true);
        }
        setCaseDialogOpen(false);
        await loadCases(selectedTheme);
    };

    const confirmDelete = async () => {
        if (!deleteTarget)
            return;
        if (deleteTarget.type === 'theme') {
            await apiDelete(`/api/admin/project-themes/${deleteTarget.id}?force=true`, true);
            const themeId = await loadThemes();
            await loadCases(themeId);
        }
        else {
            await apiDelete(`/api/admin/project-cases/${deleteTarget.id}`, true);
            await loadCases(selectedTheme);
        }
        setDeleteTarget(null);
    };

    return (<AdminShell title="Project Setup" description="Kelola tema proyek dan case assignment dalam satu halaman." icon={<Layers3 className="h-6 w-6"/>}>
      <TechConfirmDialog open={!!deleteTarget} title={deleteTarget?.type === 'theme' ? 'Delete this project theme?' : 'Delete this project case?'} description={deleteTarget?.type === 'theme'
        ? 'Tema proyek akan dihapus bersama project case yang terkait. Referensi peserta akan dibersihkan.'
        : 'Project case ini akan dihapus dari tema proyek terpilih.'} confirmLabel="Delete" cancelLabel="Cancel" intent="danger" onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete}/>

      <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <Paper elevation={0} sx={{ ...adminPageSx, p: 2 }}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-xs font-semibold text-[#1e5ba8]">project.themes</p>
              <h2 className="text-lg font-semibold text-slate-950">Tema Proyek</h2>
            </div>
            <Button size="small" startIcon={<Plus />} onClick={() => openThemeDialog()} sx={actionButtonSx}>Tambah Tema</Button>
          </div>
          <TableContainer component={Paper} sx={adminTableSx}>
            <Table size="small">
              <TableHead><TableRow><TableCell>Theme</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
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
                          <Chip label={`${theme.durationMinutes || 120} menit`} size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: 11 }}/>
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
                {!isLoading && themes.length === 0 && <TableRow><TableCell colSpan={2} align="center" sx={{ py: 5 }}>Belum ada tema proyek.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Paper elevation={0} sx={{ ...adminPageSx, p: 2 }}>
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-xs font-semibold text-[#1e5ba8]">project.cases</p>
              <h2 className="text-lg font-semibold text-slate-950">Case Proyek</h2>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel>Project Theme</InputLabel>
                <Select value={selectedTheme} onChange={(e) => setSelectedTheme(e.target.value)} label="Project Theme" sx={adminSelectSx}>
                  {themes.map((theme) => <MenuItem key={theme.id} value={theme.id}><span className="mr-2 inline-flex h-6 w-6 items-center justify-center"><ThemeIcon value={theme.icon} className="h-6 w-6" fallbackClassName="h-4 w-4"/></span>{theme.name}</MenuItem>)}
                </Select>
              </FormControl>
              <Button variant="contained" size="small" startIcon={<FolderOpen />} onClick={() => openCaseDialog()} disabled={!selectedTheme} sx={primaryButtonSx}>Buat Proyek</Button>
            </div>
          </div>
          <TableContainer component={Paper} sx={adminTableSx}>
            <Table size="small">
              <TableHead><TableRow><TableCell>Title</TableCell><TableCell align="center">Max MB</TableCell><TableCell>Formats</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
              <TableBody>
                {cases.map((projectCase) => (<TableRow key={projectCase.id} hover>
                  <TableCell>
                    <p className="font-semibold text-slate-950">{projectCase.title}</p>
                    <p className="line-clamp-2 max-w-md text-xs text-slate-500">{projectCase.description}</p>
                  </TableCell>
                  <TableCell align="center"><strong>{projectCase.maxSize}</strong></TableCell>
                  <TableCell><div className="flex flex-wrap gap-1">{(projectCase.allowedFormats || []).map((format) => <Chip key={format} label={format} size="small"/>)}</div></TableCell>
                  <TableCell align="right">
                    <Button size="small" startIcon={<Edit className="h-4 w-4"/>} onClick={() => openCaseDialog(projectCase)} sx={actionButtonSx}>Edit</Button>
                    <Button size="small" color="error" startIcon={<Trash2 className="h-4 w-4"/>} onClick={() => setDeleteTarget({ type: 'case', id: projectCase.id })} sx={actionButtonSx}>Delete</Button>
                  </TableCell>
                </TableRow>))}
                {!isLoading && cases.length === 0 && <TableRow><TableCell colSpan={4} align="center" sx={{ py: 5 }}>Belum ada case untuk tema ini.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </div>

      <Dialog open={themeDialogOpen} onClose={() => setThemeDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: adminDialogPaperSx }}>
        <DialogTitle>{editingTheme ? 'Edit Tema Proyek' : 'Tambah Tema Proyek'}</DialogTitle>
        <DialogContent><div className="mt-3 space-y-5">
          <TextField fullWidth size="small" label="Nama Tema" value={themeForm.name} onChange={(e) => setThemeForm({ ...themeForm, name: e.target.value })} sx={adminFieldSx} InputLabelProps={{ shrink: true }}/>
          <TextField fullWidth size="small" label="Deskripsi" multiline rows={3} value={themeForm.description} onChange={(e) => setThemeForm({ ...themeForm, description: e.target.value })} sx={adminFieldSx} InputLabelProps={{ shrink: true }}/>
          <TextField fullWidth size="small" type="number" label="Durasi Proyek (menit)" inputProps={{ min: 1 }} value={themeForm.durationMinutes} onChange={(e) => setThemeForm({ ...themeForm, durationMinutes: Number(e.target.value) })} sx={adminFieldSx} InputLabelProps={{ shrink: true }}/>
          <FormControlLabel control={<Switch checked={themeForm.isActive} onChange={(e) => setThemeForm({ ...themeForm, isActive: e.target.checked })}/>} label={themeForm.isActive ? 'Tema aktif dan tampil ke peserta' : 'Tema nonaktif dan disembunyikan dari peserta'}/>
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

      <Dialog open={caseDialogOpen} onClose={() => setCaseDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: adminDialogPaperSx }}>
        <DialogTitle>{editingCase ? 'Edit Project Case' : 'Buat Project Case'}</DialogTitle>
        <DialogContent><div className="mt-3 space-y-5">
          <FormControl fullWidth size="small"><InputLabel>Project Theme</InputLabel><Select value={caseForm.themeId} onChange={(e) => setCaseForm({ ...caseForm, themeId: e.target.value })} label="Project Theme" sx={adminSelectSx}>{themes.map((theme) => <MenuItem key={theme.id} value={theme.id}><span className="mr-2 inline-flex h-6 w-6 items-center justify-center"><ThemeIcon value={theme.icon} className="h-6 w-6" fallbackClassName="h-4 w-4"/></span>{theme.name}</MenuItem>)}</Select></FormControl>
          <TextField fullWidth size="small" label="Project Title" value={caseForm.title} onChange={(e) => setCaseForm({ ...caseForm, title: e.target.value })} sx={adminFieldSx} InputLabelProps={{ shrink: true }}/>
          <TextField fullWidth size="small" label="Description" multiline rows={4} value={caseForm.description} onChange={(e) => setCaseForm({ ...caseForm, description: e.target.value })} sx={adminFieldSx} InputLabelProps={{ shrink: true }}/>
          <TextField fullWidth size="small" label="Requirements (one per line)" multiline rows={4} value={caseForm.requirementsText} onChange={(e) => setCaseForm({ ...caseForm, requirementsText: e.target.value })} sx={adminFieldSx} InputLabelProps={{ shrink: true }}/>
          <TextField fullWidth size="small" label="Allowed Formats" helperText="Example: .zip, .rar, .pdf" value={caseForm.allowedFormatsText} onChange={(e) => setCaseForm({ ...caseForm, allowedFormatsText: e.target.value })} sx={adminFieldSx} InputLabelProps={{ shrink: true }}/>
          <TextField fullWidth size="small" type="number" label="Max Size (MB)" inputProps={{ min: 1 }} value={caseForm.maxSize} onChange={(e) => setCaseForm({ ...caseForm, maxSize: Number(e.target.value) })} sx={adminFieldSx} InputLabelProps={{ shrink: true }}/>
        </div></DialogContent>
        <DialogActions sx={adminDialogActionsSx}><Button onClick={() => setCaseDialogOpen(false)} sx={secondaryButtonSx}>Cancel</Button><Button onClick={saveCase} variant="contained" disabled={!caseForm.themeId || !caseForm.title.trim() || !caseForm.description.trim() || !caseForm.requirementsText.trim() || !caseForm.allowedFormatsText.trim() || caseForm.maxSize <= 0} sx={primaryButtonSx}>Save</Button></DialogActions>
      </Dialog>
    </AdminShell>);
}
