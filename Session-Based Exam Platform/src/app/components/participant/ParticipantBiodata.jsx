import { useState } from 'react';
import { useNavigate } from 'react-router';
import { TextField, Button, Paper, InputAdornment, Dialog, DialogContent } from '@mui/material';
import {
    ArrowLeft,
    ArrowRight,
    ClipboardCheck,
    Code2,
    Hash,
    ShieldCheck,
    Sparkles,
    TerminalSquare,
    UserRound,
} from 'lucide-react';
import { createSession, updateSession } from '../../utils/sessionManager';
import { apiGet, apiPatch, apiPost } from '../../utils/api';
export default function ParticipantBiodata() {
    const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        npm: '',
    });
    const [errors, setErrors] = useState({});
    const handleChange = (field) => (e) => {
        setFormData({ ...formData, [field]: e.target.value });
        if (errors[field]) {
            setErrors({ ...errors, [field]: '' });
        }
    };
    const validateForm = () => {
        const newErrors = {};
        if (!formData.name.trim())
            newErrors.name = 'Nama wajib diisi';
        if (!formData.npm.trim())
            newErrors.npm = 'NPM wajib diisi';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (validateForm()) {
        setConfirmOpen(true);
      }
    };

    const handleConfirmSubmit = async () => {
      setConfirmOpen(false);
      setIsSubmitting(true);
      try {
            const response = await apiPost('/api/participants', formData);
            createSession(formData, {
                participantId: response.id,
                sessionToken: response.sessionToken,
            });

            let themes = [];
            try {
                themes = await apiGet('/api/themes');
            }
            catch (_error) {
                // Fallback to theme selection when theme lookup fails.
            }

            if (Array.isArray(themes) && themes.length === 1 && themes[0]?.id) {
                const config = await apiGet('/api/config').catch(() => ({ waitingRoomEnabled: false }));
                const nextStatus = config.waitingRoomEnabled ? 'waiting-exam' : 'exam';
                const nextPath = config.waitingRoomEnabled ? '/participant/waiting' : '/participant/exam';
                updateSession({
                    examTheme: themes[0].id,
                    examDurationMinutes: themes[0].durationMinutes || 60,
                    status: nextStatus,
                    waitingFor: config.waitingRoomEnabled ? 'quiz' : '',
                });
                await apiPatch(`/api/participants/${response.id}`, {
                    examTheme: themes[0].id,
                    status: nextStatus,
                });
                navigate(nextPath, { replace: true });
                return;
            }

            navigate('/participant/theme-selection', { replace: true });
        }
    finally {
      setIsSubmitting(false);
    }
    };
    const fieldSx = {
        '& .MuiOutlinedInput-root': {
            borderRadius: '12px',
            backgroundColor: 'rgba(255,255,255,0.94)',
            transition: 'box-shadow 160ms ease, border-color 160ms ease, background-color 160ms ease',
            '& fieldset': { borderColor: '#dbe4f0' },
            '&:hover fieldset': { borderColor: '#8fb3df' },
            '&.Mui-focused': {
                backgroundColor: '#ffffff',
                boxShadow: '0 12px 30px rgba(30, 91, 168, 0.14)',
            },
            '&.Mui-focused fieldset': { borderColor: '#1e5ba8', borderWidth: '1px' },
        },
        '& .MuiInputLabel-root': {
            color: '#64748b',
            backgroundColor: '#f7fbff',
            paddingInline: '6px',
        },
        '& .MuiInputLabel-root.Mui-focused': { color: '#1e5ba8' },
    };
    const inputIconStyle = { width: 20, height: 20, color: '#64748b' };
    return (<div className="min-h-screen overflow-hidden bg-gradient-to-br from-[#d9ecff] via-[#cfe7ff] to-[#b9dafb] px-4 py-6 text-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-10 top-10 grid grid-cols-4 gap-2 opacity-35">
          {Array.from({ length: 16 }).map((_, index) => (<div key={index} className="h-7 w-7 rounded-md border border-[#1e5ba8]/35 bg-[#1e5ba8]/10"/>))}
        </div>
        <div className="absolute bottom-16 right-16 grid grid-cols-5 gap-2 opacity-25">
          {Array.from({ length: 15 }).map((_, index) => (<div key={index} className="h-5 w-5 rounded-[3px] border border-[#1e5ba8]/30 bg-white/25"/>))}
        </div>
        <div className="absolute bottom-20 left-1/4 font-mono text-7xl font-semibold leading-none text-[#1e5ba8]/10">{'{ }'}</div>
        <div className="absolute right-28 top-28 font-mono text-6xl font-semibold leading-none text-[#1e5ba8]/10">&lt;/&gt;</div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(30,91,168,0.075)_1px,transparent_1px),linear-gradient(90deg,rgba(30,91,168,0.075)_1px,transparent_1px)] bg-[size:46px_46px]"/>
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center">
        <Paper elevation={0} sx={{
            width: '100%',
            overflow: 'hidden',
            borderRadius: '20px',
            border: '1px solid rgba(30, 91, 168, 0.26)',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(219,238,255,0.94))',
            boxShadow: '0 24px 70px rgba(30, 91, 168, 0.2)',
            backdropFilter: 'blur(16px)',
        }}>
          <div className="grid lg:grid-cols-[0.94fr_1.06fr]">
            <aside className="relative overflow-hidden bg-[#123f77] p-8 text-white sm:p-10">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:34px_34px]"/>
              <div className="absolute right-8 top-8 grid grid-cols-3 gap-2 opacity-50">
                {Array.from({ length: 9 }).map((_, index) => (<div key={index} className="h-7 w-7 rounded-md border border-white/25 bg-white/10"/>))}
              </div>
              <div className="absolute bottom-8 left-10 font-mono text-5xl font-semibold text-white/10">&lt;data /&gt;</div>

              <div className="relative flex h-full min-h-[480px] flex-col justify-between">
                <div>
                  <div className="mb-8 inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-1.5 font-mono text-xs text-blue-50">
                    <TerminalSquare className="h-4 w-4"/>
                    participant.register()
                  </div>

                  <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/20">
                    <UserRound className="h-12 w-12"/>
                  </div>

                  <h1 className="max-w-sm text-4xl font-semibold leading-tight tracking-normal sm:text-5xl">
                    Data Peserta
                  </h1>
                  <p className="mt-4 max-w-md text-base leading-7 text-blue-100">
                    Masukkan identitas inti peserta untuk membuat sesi ujian yang terkunci dan tersimpan otomatis.
                  </p>
                </div>

                <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <div className="rounded-lg border border-white/15 bg-white/10 p-4">
                    <ShieldCheck className="mb-3 h-5 w-5 text-cyan-200"/>
                    <p className="text-sm font-semibold text-white">Secure session</p>
                    <p className="mt-1 text-sm leading-6 text-blue-100">Nama dan NPM dipakai untuk sesi pribadi.</p>
                  </div>
                  <div className="rounded-lg border border-white/15 bg-white/10 p-4">
                    <ClipboardCheck className="mb-3 h-5 w-5 text-emerald-200"/>
                    <p className="text-sm font-semibold text-white">Next step</p>
                    <p className="mt-1 text-sm leading-6 text-blue-100">Lanjut ke tahap ujian sesuai alur.</p>
                  </div>
                </div>
              </div>
            </aside>

            <section className="relative p-6 sm:p-8 lg:p-10">
              <div className="absolute right-6 top-6 grid grid-cols-3 gap-1 opacity-45">
                {Array.from({ length: 9 }).map((_, index) => (<div key={index} className="h-3 w-3 rounded-[3px] bg-[#1e5ba8]/20"/>))}
              </div>
              <div className="absolute bottom-5 right-8 font-mono text-4xl font-semibold text-[#1e5ba8]/10">&lt;form /&gt;</div>

              <div className="relative flex h-full min-h-[480px] flex-col justify-center">
                <div className="mb-7">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-[#1e5ba8]/25 bg-[#1e5ba8]/14 px-3 py-1 font-mono text-xs font-semibold text-[#1e5ba8]">
                    <Code2 className="h-4 w-4"/>
                    step_01.biodata
                  </div>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">Isi data peserta</h2>
                      <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                        Hanya Nama dan NPM yang diperlukan sebelum sistem membuka tahap ujian berikutnya.
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#1e5ba8]/18 bg-white/75 px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm">
                      2 required fields
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4">
                    <TextField fullWidth label="Nama" value={formData.name} onChange={handleChange('name')} error={!!errors.name} helperText={errors.name} variant="outlined" required sx={fieldSx} InputLabelProps={{ shrink: true }} InputProps={{ startAdornment: <InputAdornment position="start"><UserRound style={inputIconStyle}/></InputAdornment> }}/>

                    <TextField fullWidth label="NPM" value={formData.npm} onChange={handleChange('npm')} error={!!errors.npm} helperText={errors.npm} variant="outlined" required sx={fieldSx} InputLabelProps={{ shrink: true }} InputProps={{ startAdornment: <InputAdornment position="start"><Hash style={inputIconStyle}/></InputAdornment> }}/>
                  </div>

                  <div className="mt-7 grid gap-3 rounded-xl border border-[#1e5ba8]/18 bg-white/70 p-3 shadow-sm sm:grid-cols-[auto_1fr]">
                    <Button onClick={() => navigate('/')} startIcon={<ArrowLeft />} sx={{
            textTransform: 'none',
            color: '#475569',
            borderRadius: '10px',
            padding: '12px 16px',
            '&:hover': { backgroundColor: 'rgba(15, 23, 42, 0.06)' },
        }}>
                      Kembali
                    </Button>

                    <Button type="submit" variant="contained" size="large" endIcon={<ArrowRight />} sx={{
            background: 'linear-gradient(135deg, #1e5ba8 0%, #0f8fbd 100%)',
            boxShadow: '0 18px 34px rgba(30, 91, 168, 0.28)',
            '&:hover': {
                background: 'linear-gradient(135deg, #174c93 0%, #087ca8 100%)',
                boxShadow: '0 20px 38px rgba(30, 91, 168, 0.34)',
            },
            borderRadius: '10px',
            textTransform: 'none',
            fontSize: '16px',
            fontWeight: 700,
            padding: '12px 18px',
        }}>
                      Lanjutkan
                    </Button>
                  </div>
                </form>
              </div>
            </section>
          </div>
        </Paper>
      </div>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth PaperProps={{
        sx: {
          borderRadius: '18px',
          overflow: 'hidden',
          border: '1px solid rgba(30, 91, 168, 0.26)',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(220,238,255,0.96))',
          boxShadow: '0 24px 70px rgba(15, 23, 42, 0.28)',
        },
      }} BackdropProps={{
        sx: {
          backgroundColor: 'rgba(15, 23, 42, 0.42)',
          backdropFilter: 'blur(6px)',
        },
      }}>
        <DialogContent sx={{ p: 0 }}>
          <div className="relative overflow-hidden p-6 text-slate-900">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#164a8f] via-[#1e5ba8] to-[#45a6e8]"/>
            <div className="absolute right-5 top-5 grid grid-cols-3 gap-1 opacity-45">
              {Array.from({ length: 9 }).map((_, index) => (<div key={index} className="h-3 w-3 rounded-[3px] border border-[#1e5ba8]/25 bg-[#1e5ba8]/12"/>))}
            </div>
            <div className="absolute bottom-5 right-6 font-mono text-3xl font-semibold text-[#1e5ba8]/10">&lt;verify /&gt;</div>

            <div className="relative">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#1e5ba8] text-white shadow-lg shadow-blue-900/20">
                  <ShieldCheck className="h-5 w-5"/>
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-md border border-[#1e5ba8]/20 bg-[#1e5ba8]/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#1e5ba8]">
                    <TerminalSquare className="h-3.5 w-3.5"/>
                    participant.verify()
                  </div>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-950">Konfirmasi data peserta</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Pastikan data di bawah sudah benar sebelum lanjut ke tahap berikutnya.</p>
                </div>
              </div>

              <div className="rounded-lg border border-[#1e5ba8]/15 bg-[#f5fbff] p-4">
                <p className="mb-3 font-mono text-xs font-semibold text-[#1e5ba8]">const participant_data =</p>
                <div className="grid gap-2 text-sm text-slate-700">
                  <div className="flex gap-2"><span className="min-w-24 font-semibold text-slate-950">Nama</span><span>{formData.name}</span></div>
                  <div className="flex gap-2"><span className="min-w-24 font-semibold text-slate-950">NPM</span><span>{formData.npm}</span></div>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button onClick={() => setConfirmOpen(false)} disabled={isSubmitting} variant="outlined" sx={{
            borderRadius: '10px',
            textTransform: 'none',
            borderColor: 'rgba(30, 91, 168, 0.28)',
            color: '#1e5ba8',
            px: 2.5,
            '&:hover': { borderColor: '#1e5ba8', backgroundColor: '#eef7ff' },
        }}>
                  Ubah Data
                </Button>
                <Button onClick={handleConfirmSubmit} variant="contained" disabled={isSubmitting} endIcon={<ArrowRight />} sx={{
            borderRadius: '10px',
            textTransform: 'none',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #1e5ba8 0%, #0f8fbd 100%)',
            px: 2.5,
            '&:hover': { background: 'linear-gradient(135deg, #174c93 0%, #087ca8 100%)' },
        }}>
                  {isSubmitting ? 'Memproses...' : 'Ya, Lanjutkan'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>);
}
