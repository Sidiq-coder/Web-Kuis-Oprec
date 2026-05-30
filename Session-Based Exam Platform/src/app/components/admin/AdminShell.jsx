import { useState } from 'react';
import { Button, Paper } from '@mui/material';
import { ArrowLeft, Code2, TerminalSquare } from 'lucide-react';
import { useNavigate } from 'react-router';
import { apiPost } from '../../utils/api';
import { clearSession } from '../../utils/sessionManager';
import TechConfirmDialog from '../ui/TechConfirmDialog';

export const adminPageSx = {
    borderRadius: '14px',
    border: '1px solid rgba(30, 91, 168, 0.22)',
    background: 'linear-gradient(180deg, rgba(245,250,255,0.96), rgba(229,242,255,0.92))',
    boxShadow: '0 10px 26px rgba(30, 91, 168, 0.13)',
    overflow: 'hidden',
};

export const adminTableSx = {
    ...adminPageSx,
    '& .MuiTableHead-root .MuiTableRow-root': {
        background: 'linear-gradient(90deg, rgba(30, 91, 168, 0.14), rgba(69, 166, 232, 0.08))',
    },
    '& .MuiTableCell-head': {
        color: '#1e3a5f',
        fontWeight: 700,
        fontSize: '0.82rem',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        borderBottom: '1px solid rgba(30, 91, 168, 0.16)',
    },
    '& .MuiTableCell-body': {
        borderBottom: '1px solid rgba(30, 91, 168, 0.1)',
    },
    '& .MuiTableRow-root:hover': {
        backgroundColor: 'rgba(30, 91, 168, 0.045)',
    },
};

export const primaryButtonSx = {
    background: 'linear-gradient(135deg, #1e5ba8 0%, #0f8fbd 100%)',
    '&:hover': { background: 'linear-gradient(135deg, #174c93 0%, #087ca8 100%)' },
    borderRadius: '10px',
    textTransform: 'none',
    fontWeight: 700,
};

export const secondaryButtonSx = {
    borderRadius: '10px',
    textTransform: 'none',
    borderColor: 'rgba(30, 91, 168, 0.28)',
    color: '#1e5ba8',
    backgroundColor: 'rgba(255,255,255,0.58)',
    '&:hover': { borderColor: '#1e5ba8', backgroundColor: '#eef7ff' },
};

export const adminFieldSx = {
    mb: 0.75,
    minWidth: 0,
    width: '100%',
    '& .MuiOutlinedInput-root': {
        minWidth: 0,
        borderRadius: '10px',
        backgroundColor: 'rgba(255,255,255,0.9)',
        '& fieldset': { borderColor: 'rgba(30, 91, 168, 0.24)' },
        '&:hover fieldset': { borderColor: '#4f93d0' },
        '&.Mui-focused fieldset': { borderColor: '#1e5ba8' },
    },
    '& .MuiInputBase-input': {
        minWidth: 0,
    },
    '& .MuiInputLabel-root': {
        backgroundColor: '#f2f8ff',
        px: 0.75,
        color: '#52637a',
    },
    '& .MuiInputLabel-root.Mui-focused': { color: '#1e5ba8' },
    '& .MuiFormHelperText-root': { mx: 0.5 },
};

export const adminSelectSx = {
    mb: 0.35,
    minWidth: 0,
    borderRadius: '10px',
    backgroundColor: 'rgba(255,255,255,0.9)',
    '& .MuiSelect-select': {
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    '& fieldset': { borderColor: 'rgba(30, 91, 168, 0.24)' },
    '&:hover fieldset': { borderColor: '#4f93d0' },
    '&.Mui-focused fieldset': { borderColor: '#1e5ba8' },
};

export const adminDialogPaperSx = {
    borderRadius: '16px',
    border: '1px solid rgba(30, 91, 168, 0.24)',
    background: 'linear-gradient(180deg, #f8fbff, #eaf5ff)',
    boxShadow: '0 24px 70px rgba(15, 23, 42, 0.24)',
};

export const adminDialogActionsSx = {
    px: 3,
    pb: 3,
    pt: 2,
    gap: 1,
};

export const actionButtonSx = {
    borderRadius: '8px',
    textTransform: 'none',
    fontWeight: 600,
};

export function AdminStatCard({ label, value, icon, tone = 'blue' }) {
    const toneClass = {
        blue: 'bg-[#d7ecff] text-[#1e5ba8]',
        green: 'bg-emerald-100 text-emerald-700',
        amber: 'bg-amber-100 text-amber-700',
        red: 'bg-red-100 text-red-700',
        purple: 'bg-indigo-100 text-indigo-700',
    }[tone] || 'bg-[#d7ecff] text-[#1e5ba8]';

    return (<Paper elevation={0} sx={adminPageSx}>
      <div className="relative overflow-hidden p-4">
        <div className="absolute right-3 top-3 grid grid-cols-3 gap-1 opacity-45">
          {Array.from({ length: 9 }).map((_, index) => (<div key={index} className="h-2 w-2 rounded-[2px] bg-[#1e5ba8]/18"/>))}
        </div>
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
            <p className="mt-1 text-3xl font-semibold text-slate-950">{value}</p>
          </div>
          <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${toneClass}`}>
            {icon}
          </div>
        </div>
      </div>
    </Paper>);
}

export default function AdminShell({ title, description, icon, actions, children, maxWidth = 'max-w-7xl', showBack = true }) {
    const navigate = useNavigate();
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const handleResetSessions = async () => {
    setIsResetting(true);
    try {
      const result = await apiPost('/api/admin/sessions/reset', {}, true);
      clearSession();
      setResetMessage(`Semua sesi peserta berhasil dibersihkan. ${result.clearedWaitingCount || 0} antrean waiting room ikut dikosongkan.`);
    }
    catch {
      setResetMessage('Gagal membersihkan sesi peserta.');
    }
    finally {
      setIsResetting(false);
      setIsResetDialogOpen(false);
    }
  };

    return (<div className="min-h-screen overflow-hidden bg-gradient-to-br from-[#d9ecff] via-[#cfe7ff] to-[#b9dafb] px-4 py-4 text-slate-900 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-8 top-10 grid grid-cols-4 gap-2 opacity-30">
          {Array.from({ length: 16 }).map((_, index) => (<div key={index} className="h-7 w-7 rounded-md border border-[#1e5ba8]/35 bg-[#1e5ba8]/10"/>))}
        </div>
        <div className="absolute bottom-12 right-12 grid grid-cols-5 gap-2 opacity-25">
          {Array.from({ length: 15 }).map((_, index) => (<div key={index} className="h-5 w-5 rounded-[3px] border border-[#1e5ba8]/30 bg-white/25"/>))}
        </div>
        <div className="absolute bottom-16 left-24 font-mono text-7xl font-semibold leading-none text-[#1e5ba8]/10">{'{ }'}</div>
        <div className="absolute right-28 top-28 font-mono text-6xl font-semibold leading-none text-[#1e5ba8]/10">&lt;/&gt;</div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(30,91,168,0.075)_1px,transparent_1px),linear-gradient(90deg,rgba(30,91,168,0.075)_1px,transparent_1px)] bg-[size:46px_46px]"/>
      </div>

      <div className={`relative mx-auto ${maxWidth}`}>
        <TechConfirmDialog open={isResetDialogOpen} title="Bersihkan semua sesi?" description="Semua sesi peserta yang tersimpan di perangkat akan dianggap tidak valid. Peserta yang masih membuka halaman akan kembali ke halaman awal saat memuat ulang atau membuka ulang web ini." confirmLabel={isResetting ? 'Memproses...' : 'Ya, Bersihkan'} cancelLabel="Batal" intent="danger" onCancel={() => setIsResetDialogOpen(false)} onConfirm={handleResetSessions}/>
        <Paper elevation={0} sx={{
            borderRadius: '16px',
            border: '1px solid rgba(30, 91, 168, 0.26)',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(219,238,255,0.94))',
            boxShadow: '0 14px 34px rgba(30, 91, 168, 0.18)',
            backdropFilter: 'blur(16px)',
            mb: 2,
        }}>
          <div className="relative overflow-hidden rounded-[16px]">
            <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#1e5ba8] via-[#2f8bd3] to-cyan-400"/>
            <div className="absolute right-4 top-4 grid grid-cols-3 gap-1 opacity-45">
              {Array.from({ length: 9 }).map((_, index) => (<div key={index} className="h-3 w-3 rounded-[3px] bg-[#1e5ba8]/20"/>))}
            </div>
            <div className="absolute bottom-3 right-24 font-mono text-3xl font-semibold text-[#1e5ba8]/10">&lt;admin&gt;</div>
            <div className="flex flex-col gap-3 p-4 pl-6 sm:flex-row sm:items-center sm:justify-between sm:p-5 sm:pl-7">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#1e5ba8] text-white shadow-lg shadow-blue-900/20">
                  {icon || <TerminalSquare className="h-5 w-5"/>}
                </div>
                <div>
                  <div className="mb-1 inline-flex items-center gap-2 rounded-md border border-[#1e5ba8]/25 bg-[#1e5ba8]/14 px-2.5 py-1 text-xs font-semibold text-[#1e5ba8]">
                    <Code2 className="h-4 w-4"/>
                    admin.console
                  </div>
                  <h1 className="text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">{title}</h1>
                  {description && <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {showBack && (<Button variant="outlined" startIcon={<ArrowLeft />} onClick={() => navigate('/admin')} sx={secondaryButtonSx}>
                  Back
                </Button>)}
                <Button variant="outlined" color="error" onClick={() => setIsResetDialogOpen(true)} sx={{
            borderRadius: '10px',
            textTransform: 'none',
            fontWeight: 700,
            borderColor: 'rgba(220, 38, 38, 0.28)',
            color: '#dc2626',
            backgroundColor: 'rgba(255,255,255,0.58)',
            '&:hover': { borderColor: '#dc2626', backgroundColor: '#fff1f2' },
        }}>
                  Bersihkan Sesi
                </Button>
                {actions}
              </div>
            </div>
          </div>
        </Paper>

        {resetMessage && (<div className="mb-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm">
            {resetMessage}
          </div>)}

        {children}
      </div>
    </div>);
}
