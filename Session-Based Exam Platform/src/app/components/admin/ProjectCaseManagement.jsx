import { useEffect, useState } from 'react';
import { Paper, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, Chip, } from '@mui/material';
import { Plus, Edit, Trash2, FolderOpen } from 'lucide-react';
import { apiDelete, apiGet, apiPatch, apiPost } from '../../utils/api';
import TechConfirmDialog from '../ui/TechConfirmDialog';
import AdminShell, { actionButtonSx, adminDialogActionsSx, adminDialogPaperSx, adminFieldSx, adminPageSx, adminSelectSx, adminTableSx, primaryButtonSx, secondaryButtonSx } from './AdminShell';
export default function ProjectCaseManagement() {
    const [themes, setThemes] = useState([]);
    const [projectCases, setProjectCases] = useState([]);
    const [selectedTheme, setSelectedTheme] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCase, setEditingCase] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [formData, setFormData] = useState({
        themeId: '',
        title: '',
        description: '',
        requirementsText: '',
        allowedFormatsText: '',
        maxSize: 10,
    });
    useEffect(() => {
        apiGet('/api/project-themes', true)
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
        apiGet(`/api/admin/project-cases?themeId=${encodeURIComponent(selectedTheme)}`, true).then((data) => {
            setProjectCases(data);
        });
    }, [selectedTheme]);
    const resetForm = (themeId) => {
        setFormData({
            themeId,
            title: '',
            description: '',
            requirementsText: '',
            allowedFormatsText: '',
            maxSize: 10,
        });
    };
    const handleOpenDialog = (projectCase) => {
        if (projectCase) {
            setEditingCase(projectCase);
            setFormData({
                themeId: projectCase.themeId,
                title: projectCase.title,
                description: projectCase.description,
                requirementsText: (projectCase.requirements || []).join('\n'),
                allowedFormatsText: (projectCase.allowedFormats || []).join(', '),
                maxSize: projectCase.maxSize || 10,
            });
        }
        else {
            setEditingCase(null);
            resetForm(selectedTheme);
        }
        setDialogOpen(true);
    };
    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingCase(null);
    };
    const parseList = (value) => value
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
    const handleSave = async () => {
        const payload = {
            themeId: formData.themeId,
            title: formData.title.trim(),
            description: formData.description.trim(),
            requirements: parseList(formData.requirementsText),
            allowedFormats: parseList(formData.allowedFormatsText),
            maxSize: Number(formData.maxSize),
        };
        if (editingCase) {
            const updated = await apiPatch(`/api/admin/project-cases/${editingCase.id}`, payload, true);
            setProjectCases((prev) => prev.map((item) => (item.id === editingCase.id ? updated : item)));
        }
        else {
            const created = await apiPost('/api/admin/project-cases', payload, true);
            setProjectCases((prev) => [...prev, created]);
        }
        handleCloseDialog();
    };
    const handleDelete = async (projectCaseId) => {
        await apiDelete(`/api/admin/project-cases/${projectCaseId}`, true);
        setProjectCases(projectCases.filter((item) => item.id !== projectCaseId));
        setDeleteTarget(null);
    };
    const currentCases = projectCases || [];
    return (<AdminShell title="Project Case Management" description="Create project cases under project themes only." icon={<FolderOpen className="h-6 w-6"/>} actions={<Button variant="contained" startIcon={<Plus />} onClick={() => handleOpenDialog()} sx={primaryButtonSx}>
        Add Project Case
      </Button>}>
      <TechConfirmDialog open={!!deleteTarget} title="Delete this project case?" description="This project case will be removed from the selected project theme and participants will no longer receive it as an assignment." confirmLabel="Delete Case" cancelLabel="Cancel" intent="danger" onCancel={() => setDeleteTarget(null)} onConfirm={() => handleDelete(deleteTarget)}/>

        <Paper elevation={0} sx={{ ...adminPageSx, p: 2, mb: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Select Project Theme</InputLabel>
            <Select value={selectedTheme} onChange={(e) => setSelectedTheme(e.target.value)} label="Select Project Theme" sx={adminSelectSx}>
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
                <TableCell>Title</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="center">Max Size (MB)</TableCell>
                <TableCell>Formats</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {currentCases.map((projectCase) => (<TableRow key={projectCase.id} hover>
                  <TableCell>
                    <strong>{projectCase.title}</strong>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-md">
                      {projectCase.description.length > 120
                ? projectCase.description.substring(0, 120) + '...'
                : projectCase.description}
                    </div>
                  </TableCell>
                  <TableCell align="center">{projectCase.maxSize}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {(projectCase.allowedFormats || []).map((format) => (<Chip key={format} label={format} size="small"/>))}
                    </div>
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" startIcon={<Edit className="w-4 h-4"/>} onClick={() => handleOpenDialog(projectCase)} sx={{ ...actionButtonSx, mr: 1 }}>
                      Edit
                    </Button>
                    <Button size="small" color="error" startIcon={<Trash2 className="w-4 h-4"/>} onClick={() => setDeleteTarget(projectCase.id)} sx={actionButtonSx}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>))}
              {!isLoading && currentCases.length === 0 && (<TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                    <p className="text-gray-500">No project cases found for this project theme</p>
                  </TableCell>
                </TableRow>)}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth PaperProps={{ sx: adminDialogPaperSx }}>
          <DialogTitle>{editingCase ? 'Edit Project Case' : 'Add New Project Case'}</DialogTitle>
          <DialogContent>
            <div className="space-y-5 mt-3">
              <FormControl fullWidth size="small">
                <InputLabel>Project Theme</InputLabel>
                <Select value={formData.themeId} onChange={(e) => setFormData({ ...formData, themeId: e.target.value })} label="Project Theme" sx={adminSelectSx}>
                  {themes.map((theme) => (<MenuItem key={theme.id} value={theme.id}>
                      {theme.icon} {theme.name}
                    </MenuItem>))}
                </Select>
              </FormControl>

              <TextField fullWidth size="small" label="Project Title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} sx={adminFieldSx} InputLabelProps={{ shrink: true }}/>

              <TextField fullWidth size="small" label="Description" multiline rows={4} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} sx={adminFieldSx} InputLabelProps={{ shrink: true }}/>

              <TextField fullWidth size="small" label="Requirements (one per line)" multiline rows={4} value={formData.requirementsText} onChange={(e) => setFormData({ ...formData, requirementsText: e.target.value })} sx={adminFieldSx} InputLabelProps={{ shrink: true }}/>

              <TextField fullWidth size="small" label="Allowed Formats (comma or newline separated)" value={formData.allowedFormatsText} onChange={(e) => setFormData({ ...formData, allowedFormatsText: e.target.value })} helperText="Example: .zip, .rar, .pdf" sx={adminFieldSx} InputLabelProps={{ shrink: true }}/>

              <TextField fullWidth size="small" label="Max Size (MB)" type="number" inputProps={{ min: 1 }} value={formData.maxSize} onChange={(e) => setFormData({ ...formData, maxSize: Number(e.target.value) })} sx={adminFieldSx} InputLabelProps={{ shrink: true }}/>
            </div>
          </DialogContent>
          <DialogActions sx={adminDialogActionsSx}>
            <Button onClick={handleCloseDialog} sx={secondaryButtonSx}>
              Cancel
            </Button>
            <Button onClick={handleSave} variant="contained" disabled={!formData.themeId ||
            !formData.title.trim() ||
            !formData.description.trim() ||
            !formData.requirementsText.trim() ||
            !formData.allowedFormatsText.trim() ||
            formData.maxSize <= 0} sx={{
            ...primaryButtonSx,
        }}>
              Save
            </Button>
          </DialogActions>
        </Dialog>
    </AdminShell>);
}
