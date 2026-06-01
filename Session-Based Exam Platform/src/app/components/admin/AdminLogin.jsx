import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Alert, Button, IconButton, InputAdornment, Paper, TextField, Tooltip } from '@mui/material';
import { ArrowLeft, Eye, EyeOff, KeyRound, ShieldCheck, TerminalSquare, UserRound } from 'lucide-react';
import { apiPost, setAdminToken } from '../../utils/api';
import { adminFieldSx, primaryButtonSx, secondaryButtonSx } from './AdminShell';

export default function AdminLogin() {
    const navigate = useNavigate();
    const location = useLocation();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        const normalizedUser = username.trim();
        setError('');
        setIsSubmitting(true);
        try {
            const response = await apiPost('/api/admin/login', {
                username: normalizedUser,
                password,
            });
            setAdminToken(response.token);
            const nextPath = location.state?.from || '/admin';
            navigate(nextPath, { replace: true });
        }
        catch (loginError) {
            setError('Username atau password salah.');
        }
        finally {
            setIsSubmitting(false);
        }
    };

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

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl items-center">
        <Paper elevation={0} sx={{
            width: '100%',
            borderRadius: '18px',
            border: '1px solid rgba(30, 91, 168, 0.26)',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(219,238,255,0.94))',
            boxShadow: '0 24px 70px rgba(30, 91, 168, 0.2)',
            overflow: 'hidden',
            backdropFilter: 'blur(16px)',
        }}>
          <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
            <aside className="relative overflow-hidden bg-[#123f77] p-8 text-white">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:34px_34px]"/>
              <div className="absolute right-8 top-8 grid grid-cols-3 gap-2 opacity-50">
                {Array.from({ length: 9 }).map((_, index) => (<div key={index} className="h-7 w-7 rounded-md border border-white/25 bg-white/10"/>))}
              </div>
              <div className="relative">
                <div className="mb-10 flex h-14 w-14 items-center justify-center rounded-lg bg-white text-[#1e5ba8] shadow-xl shadow-blue-950/25">
                  <ShieldCheck className="h-8 w-8"/>
                </div>
                <p className="mb-3 inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-1 font-mono text-xs text-blue-50">
                  <TerminalSquare className="h-4 w-4"/>
                  admin.auth()
                </p>
                <h1 className="max-w-sm text-4xl font-semibold leading-tight tracking-normal">Admin Control Panel</h1>
                <p className="mt-4 max-w-sm text-sm leading-7 text-blue-100">
                  Secure access for managing themes, questions, monitoring, reviews, and scoring.
                </p>
              </div>
            </aside>

            <section className="p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-slate-950">Login Admin</h2>
                <p className="mt-1 text-sm text-slate-600">Masukkan kredensial untuk masuk dashboard.</p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="space-y-5">
                  <TextField label="Username" value={username} onChange={(event) => setUsername(event.target.value)} fullWidth size="small" sx={adminFieldSx} InputLabelProps={{ shrink: true }} InputProps={{ startAdornment: <InputAdornment position="start"><UserRound className="h-4 w-4 text-slate-500"/></InputAdornment> }}/>
                  <TextField label="Password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} fullWidth size="small" sx={adminFieldSx} InputLabelProps={{ shrink: true }} InputProps={{
                      startAdornment: <InputAdornment position="start"><KeyRound className="h-4 w-4 text-slate-500"/></InputAdornment>,
                      endAdornment: <InputAdornment position="end">
                        <Tooltip title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}>
                          <IconButton aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'} edge="end" size="small" onClick={() => setShowPassword((value) => !value)}>
                            {showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>,
                  }}/>
                </div>

                {error && <Alert severity="error" sx={{ borderRadius: '10px' }}>{error}</Alert>}

                <div className="mt-6 space-y-3">
                  <Button type="submit" variant="contained" fullWidth disabled={isSubmitting} sx={{ ...primaryButtonSx, minHeight: 42 }}>
                    {isSubmitting ? 'Memeriksa...' : 'Login Admin'}
                  </Button>

                  <Button variant="outlined" fullWidth startIcon={<ArrowLeft />} onClick={() => navigate('/')} sx={{ ...secondaryButtonSx, minHeight: 42 }}>
                    Kembali ke Beranda
                  </Button>
                </div>
              </form>
            </section>
          </div>
        </Paper>
      </div>
    </div>);
}
