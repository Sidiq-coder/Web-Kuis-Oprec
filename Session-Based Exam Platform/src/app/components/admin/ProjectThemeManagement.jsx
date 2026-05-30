import { useEffect, useState } from 'react';
import { Paper, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, TextField, } from '@mui/material';
import { Plus, Edit, Trash2, Layers3 } from 'lucide-react';
import { apiDelete, apiGet, apiPatch, apiPost } from '../../utils/api';
import TechConfirmDialog from '../ui/TechConfirmDialog';
import AdminShell, { actionButtonSx, adminDialogActionsSx, adminDialogPaperSx, adminFieldSx, adminTableSx, primaryButtonSx, secondaryButtonSx } from './AdminShell';

export default function ProjectThemeManagement() {
    const [themes, setThemes] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTheme, setEditingTheme] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteConflict, setDeleteConflict] = useState(null);
    const [isForceDeleting, setIsForceDeleting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        icon: '',
    });

    useEffect(() => {
        apiGet('/api/project-themes', true)
            .then((data) => setThemes(data))
            .catch(() => setError('Gagal memuat data tema proyek.'))
            .finally(() => setIsLoading(false));
    }, []);

    const handleOpenDialog = (theme) => {
        if (theme) {
            setEditingTheme(theme);
            setFormData({
                name: theme.name,
                description: theme.description,
                icon: theme.icon,
            });
        }
        else {
            setEditingTheme(null);
            setFormData({ name: '', description: '', icon: '' });
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingTheme(null);
        setFormData({ name: '', description: '', icon: '' });
    };

    const handleSave = async () => {
        if (editingTheme) {
            const updated = await apiPatch(`/api/admin/project-themes/${editingTheme.id}`, formData, true);
            setThemes(themes.map((t) => (t.id === editingTheme.id ? updated : t)));
        }
        else {
            const created = await apiPost('/api/admin/project-themes', formData, true);
            setThemes([...themes, created]);
        }
        handleCloseDialog();
    };

    const handleDelete = async (id, force = false) => {
        try {
            await apiDelete(`/api/admin/project-themes/${id}${force ? '?force=true' : ''}`, true);
            setThemes(themes.filter((t) => t.id !== id));
            setDeleteTarget(null);
            setDeleteConflict(null);
            setError('');
        }
        catch (error) {
            let message = 'Gagal menghapus tema proyek.';
            let conflictInfo = null;
            try {
                const parsed = JSON.parse(error.message);
                if (parsed?.error) {
                    message = parsed.error;
                    if (parsed.participantCount || parsed.submissionCount) {
                        message += ` (${parsed.participantCount || 0} peserta, ${parsed.submissionCount || 0} submission masih memakai tema ini)`;
                        conflictInfo = {
                            id,
                            participantCount: parsed.participantCount || 0,
                            submissionCount: parsed.submissionCount || 0,
                        };
                    }
                }
            }
            catch (_parseError) {
                if (error?.message) {
                    message = error.message;
                }
            }
            setError(message);
            if (conflictInfo && !force) {
                setDeleteTarget(null);
                setDeleteConflict(conflictInfo);
            }
        }
    };

    const handleForceDelete = async () => {
        if (!deleteConflict) {
            return;
        }
        setIsForceDeleting(true);
        try {
            await handleDelete(deleteConflict.id, true);
        }
        finally {
            setIsForceDeleting(false);
        }
    };

    return (<AdminShell title="Project Theme Management" description="Manage project themes separately from quiz themes." icon={<Layers3 className="h-6 w-6"/>} actions={<Button variant="contained" startIcon={<Plus />} onClick={() => handleOpenDialog()} sx={primaryButtonSx}>
        Add Project Theme
      </Button>}>
      <TechConfirmDialog open={!!deleteTarget} title="Delete this project theme?" description="This project theme will be removed from project selection and project case assignment data." confirmLabel="Delete Project Theme" cancelLabel="Cancel" intent="danger" onCancel={() => setDeleteTarget(null)} onConfirm={() => handleDelete(deleteTarget)}/>

      <TechConfirmDialog open={!!deleteConflict} title="Project theme still in use" description={deleteConflict
        ? `This project theme is still referenced by ${deleteConflict.participantCount} participant(s) and ${deleteConflict.submissionCount} submission(s). If you continue, those references will be cleared first, then the project theme will be deleted.`
        : ''} confirmLabel={isForceDeleting ? 'Deleting...' : 'Force Delete'} cancelLabel="Cancel" intent="danger" onCancel={() => setDeleteConflict(null)} onConfirm={handleForceDelete}/>

      <TableContainer component={Paper} sx={adminTableSx}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f8fafc' }}>
              <TableCell>Icon</TableCell>
              <TableCell>Project Theme Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {themes.map((theme) => (<TableRow key={theme.id} hover>
              <TableCell>
                <span className="text-3xl">{theme.icon}</span>
              </TableCell>
              <TableCell>
                <strong>{theme.name}</strong>
              </TableCell>
              <TableCell>{theme.description}</TableCell>
              <TableCell align="right">
                <Button size="small" startIcon={<Edit className="w-4 h-4"/>} onClick={() => handleOpenDialog(theme)} sx={{ ...actionButtonSx, mr: 1 }}>
                  Edit
                </Button>
                <Button size="small" color="error" startIcon={<Trash2 className="w-4 h-4"/>} onClick={() => setDeleteTarget(theme.id)} sx={actionButtonSx}>
                  Delete
                </Button>
              </TableCell>
            </TableRow>))}
            {!isLoading && themes.length === 0 && (<TableRow>
              <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                <p className="text-gray-500">No project themes available.</p>
              </TableCell>
            </TableRow>)}
          </TableBody>
        </Table>
      </TableContainer>

      {error && (<div className="mt-4 text-center text-red-600 text-sm">{error}</div>)}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth PaperProps={{ sx: adminDialogPaperSx }}>
        <DialogTitle>{editingTheme ? 'Edit Project Theme' : 'Add New Project Theme'}</DialogTitle>
        <DialogContent>
          <div className="space-y-5 mt-3">
            <TextField fullWidth size="small" label="Project Theme Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} sx={adminFieldSx} InputLabelProps={{ shrink: true }}/>
            <TextField fullWidth size="small" label="Description" multiline rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} sx={adminFieldSx} InputLabelProps={{ shrink: true }}/>
            <TextField fullWidth size="small" label="Icon (Emoji)" value={formData.icon} onChange={(e) => setFormData({ ...formData, icon: e.target.value })} helperText="Enter a single emoji character" sx={adminFieldSx} InputLabelProps={{ shrink: true }}/>
          </div>
        </DialogContent>
        <DialogActions sx={adminDialogActionsSx}>
          <Button onClick={handleCloseDialog} sx={secondaryButtonSx}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.name || !formData.description || !formData.icon} sx={{
            ...primaryButtonSx,
        }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </AdminShell>);
}
