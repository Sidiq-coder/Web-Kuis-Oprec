import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Paper } from '@mui/material';
import { BarChart3, ClipboardCheck, FileText, FolderOpen, Home, Layers3, LayoutDashboard, Palette, ShieldCheck, Users } from 'lucide-react';
import { apiGet } from '../../utils/api';
import AdminShell, { AdminStatCard, adminPageSx, secondaryButtonSx } from './AdminShell';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalParticipants: 0,
        activeSessions: 0,
        pendingReviews: 0,
        completedExams: 0,
    });

    useEffect(() => {
        let isMounted = true;
        const loadStats = async () => {
            try {
                const [participants, essays, projects] = await Promise.all([
                    apiGet('/api/admin/monitoring', true),
                    apiGet('/api/admin/essay-reviews', true),
                    apiGet('/api/admin/project-reviews', true),
                ]);
                if (!isMounted)
                    return;
                setStats({
                    totalParticipants: participants.length,
                    activeSessions: participants.filter((p) => ['exam', 'project', 'waiting-exam', 'waiting-project'].includes(p.status)).length,
                    pendingReviews: essays.filter((item) => item.status === 'pending').length +
                        projects.filter((item) => item.status === 'pending').length,
                    completedExams: participants.filter((p) => p.status === 'completed').length,
                });
            }
            catch {
                if (isMounted) {
                    setStats({ totalParticipants: 0, activeSessions: 0, pendingReviews: 0, completedExams: 0 });
                }
            }
        };
        loadStats();
        return () => {
            isMounted = false;
        };
    }, []);

    const menuItems = [
        { title: 'Quiz Setup', description: 'Kelola tema kuis dan bank soal dari satu halaman', icon: <Palette className="h-6 w-6"/>, path: '/admin/quiz-setup', code: 'quiz.setup()' },
        { title: 'Project Setup', description: 'Kelola tema proyek dan case assignment dalam satu halaman', icon: <Layers3 className="h-6 w-6"/>, path: '/admin/project-setup', code: 'project.setup()' },
        { title: 'Participant Monitoring', description: 'Track participant progress in real-time', icon: <Users className="h-6 w-6"/>, path: '/admin/monitoring', code: 'watch.live()' },
        { title: 'Waiting Room', description: 'Aktifkan antrean dan izinkan peserta masuk kuis atau proyek', icon: <ShieldCheck className="h-6 w-6"/>, path: '/admin/waiting-room', code: 'gate.approve()' },
        { title: 'Overall Scores', description: 'View total exam and project results', icon: <BarChart3 className="h-6 w-6"/>, path: '/admin/overall-scores', code: 'scores.total()' },
        { title: 'Participant Results', description: 'Isi nomor peserta dan status diterima atau tidak diterima', icon: <ClipboardCheck className="h-6 w-6"/>, path: '/admin/participant-results', code: 'results.publish()' },
        { title: 'Essay Review', description: 'Grade and review essay submissions', icon: <FileText className="h-6 w-6"/>, path: '/admin/essay-review', code: 'essay.grade()' },
        { title: 'Project Review', description: 'Download and evaluate project files', icon: <FolderOpen className="h-6 w-6"/>, path: '/admin/project-review', code: 'project.review()' },
    ];

    return (<AdminShell title="Admin Dashboard" description="Manage your CBT system from one control surface." icon={<LayoutDashboard className="h-6 w-6"/>} showBack={false} actions={<Button variant="outlined" startIcon={<Home />} onClick={() => navigate('/')} sx={secondaryButtonSx}>
        Back to Home
      </Button>}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <AdminStatCard label="Total Participants" value={stats.totalParticipants} icon={<Users className="h-5 w-5"/>}/>
        <AdminStatCard label="Active Sessions" value={stats.activeSessions} icon={<BarChart3 className="h-5 w-5"/>} tone="green"/>
        <AdminStatCard label="Pending Reviews" value={stats.pendingReviews} icon={<FileText className="h-5 w-5"/>} tone="amber"/>
        <AdminStatCard label="Completed Exams" value={stats.completedExams} icon={<FolderOpen className="h-5 w-5"/>} tone="purple"/>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {menuItems.map((item) => (<Paper key={item.title} elevation={0} onClick={() => navigate(item.path)} sx={{
                ...adminPageSx,
                cursor: 'pointer',
                transition: 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 14px 30px rgba(30, 91, 168, 0.2)',
                    borderColor: '#4f93d0',
                },
            }}>
            <div className="group relative min-h-[138px] overflow-hidden p-4">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#1e5ba8]/28 via-[#5ba6e8]/18 to-[#1e5ba8]/10"/>
              <div className="absolute right-4 top-4 grid grid-cols-3 gap-1 opacity-55 transition group-hover:opacity-85">
                {Array.from({ length: 9 }).map((_, index) => (<div key={index} className="h-2.5 w-2.5 rounded-[2px] border border-[#1e5ba8]/18 bg-[#1e5ba8]/10"/>))}
              </div>
              <div className="absolute bottom-12 right-16 font-mono text-[11px] font-semibold text-[#1e5ba8]/22">{item.code}</div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#d7ecff] text-[#1e5ba8] shadow-sm shadow-blue-900/5">
                  {item.icon}
                </div>
                <div className="min-w-0 pr-8">
                  <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-slate-600">{item.description}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-blue-100 pt-2.5">
                <span className="text-xs font-semibold text-[#1e5ba8]">Open module</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-[#1e5ba8] transition group-hover:bg-[#1e5ba8] group-hover:text-white">
                  <BarChart3 className="h-4 w-4"/>
                </div>
              </div>
            </div>
          </Paper>))}
      </div>
    </AdminShell>);
}
