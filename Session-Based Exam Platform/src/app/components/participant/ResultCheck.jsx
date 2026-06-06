import { useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertCircle, ArrowLeft, BadgeCheck, Search, XCircle } from 'lucide-react';
import { Button, Paper, TextField } from '@mui/material';
import { apiGet } from '../../utils/api';

const statusContent = {
    accepted: {
        title: 'Diterima',
        description: 'Nomor peserta ini tercatat diterima.',
        icon: <BadgeCheck className="h-8 w-8" />,
        className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    },
    rejected: {
        title: 'Tidak Diterima',
        description: 'Nomor peserta ini tercatat tidak diterima.',
        icon: <XCircle className="h-8 w-8" />,
        className: 'border-red-200 bg-red-50 text-red-800',
    },
};

export default function ResultCheck() {
    const navigate = useNavigate();
    const [participantNumber, setParticipantNumber] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        const number = participantNumber.trim();
        setResult(null);
        setError('');

        if (!number) {
            setError('Masukkan nomor peserta terlebih dahulu.');
            return;
        }

        setIsLoading(true);
        try {
            const data = await apiGet(`/api/participant-results/${encodeURIComponent(number)}`);
            setResult(data);
        }
        catch {
            setError('Nomor peserta tidak ditemukan. Pastikan nomor sudah benar atau hubungi panitia.');
        }
        finally {
            setIsLoading(false);
        }
    };

    const content = result ? statusContent[result.status] : null;

    return (
        <div className="min-h-screen overflow-hidden bg-gradient-to-br from-[#d9ecff] via-[#cfe7ff] to-[#b9dafb] px-4 py-6 text-slate-900">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute left-10 top-10 grid grid-cols-4 gap-2 opacity-35">
                    {Array.from({ length: 16 }).map((_, index) => (
                        <div key={index} className="h-7 w-7 rounded-md border border-[#1e5ba8]/35 bg-[#1e5ba8]/10" />
                    ))}
                </div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(30,91,168,0.075)_1px,transparent_1px),linear-gradient(90deg,rgba(30,91,168,0.075)_1px,transparent_1px)] bg-[size:46px_46px]" />
            </div>

            <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl items-center">
                <Paper elevation={0} sx={{
                    width: '100%',
                    borderRadius: '18px',
                    border: '1px solid rgba(30, 91, 168, 0.26)',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(219,238,255,0.94))',
                    boxShadow: '0 24px 70px rgba(30, 91, 168, 0.2)',
                    overflow: 'hidden',
                    backdropFilter: 'blur(16px)',
                }}>
                    <div className="relative p-6 sm:p-8">
                        <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#1e5ba8] via-[#2f8bd3] to-cyan-400" />
                        <Button variant="outlined" startIcon={<ArrowLeft />} onClick={() => navigate('/')} sx={{
                            mb: 3,
                            borderRadius: '10px',
                            textTransform: 'none',
                            borderColor: 'rgba(30, 91, 168, 0.28)',
                            color: '#1e5ba8',
                        }}>
                            Kembali
                        </Button>

                        <div className="mb-6">
                            <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-[#1e5ba8]/25 bg-[#1e5ba8]/14 px-3 py-1 font-mono text-xs font-semibold text-[#1e5ba8]">
                                <Search className="h-4 w-4" />
                                result.lookup
                            </div>
                            <h1 className="text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">Cek Kelulusan Peserta</h1>
                            <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                                Masukkan nomor peserta untuk melihat status diterima atau tidak diterima.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="rounded-xl border border-[#1e5ba8]/18 bg-white/75 p-4 shadow-sm">
                            <TextField
                                fullWidth
                                label="Nomor peserta"
                                value={participantNumber}
                                onChange={(event) => setParticipantNumber(event.target.value)}
                                placeholder="Contoh: OPREC-001"
                                disabled={isLoading}
                                sx={{
                                    mb: 2,
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '10px',
                                        backgroundColor: 'white',
                                    },
                                }}
                            />
                            <Button
                                type="submit"
                                variant="contained"
                                fullWidth
                                size="large"
                                startIcon={<Search />}
                                disabled={isLoading}
                                sx={{
                                    background: 'linear-gradient(135deg, #1e5ba8 0%, #0f8fbd 100%)',
                                    '&:hover': { background: 'linear-gradient(135deg, #174c93 0%, #087ca8 100%)' },
                                    borderRadius: '10px',
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    padding: '12px',
                                }}
                            >
                                {isLoading ? 'Mengecek...' : 'Cek Status'}
                            </Button>
                        </form>

                        {error && (
                            <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                                <p className="text-sm leading-6">{error}</p>
                            </div>
                        )}

                        {content && (
                            <div className={`mt-5 rounded-xl border p-5 ${content.className}`}>
                                <div className="flex items-start gap-4">
                                    <div className="shrink-0">{content.icon}</div>
                                    <div>
                                        <p className="text-sm font-semibold uppercase tracking-[0.1em]">Status</p>
                                        <h2 className="mt-1 text-2xl font-semibold">{content.title}</h2>
                                        <p className="mt-2 text-sm leading-6">{content.description}</p>
                                        {result.note && <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-sm leading-6">{result.note}</p>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </Paper>
            </div>
        </div>
    );
}
