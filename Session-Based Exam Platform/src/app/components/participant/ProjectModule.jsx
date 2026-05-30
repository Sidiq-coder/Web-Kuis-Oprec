import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Paper, Button, Alert, Chip, LinearProgress } from '@mui/material';
import { Clock, Upload, FileText, Send, CheckCircle } from 'lucide-react';
import { getSession, updateSession } from '../../utils/sessionManager';
import { apiGet, apiPatch, apiPost } from '../../utils/api';
import TechConfirmDialog from '../ui/TechConfirmDialog';
export default function ProjectModule() {
    const navigate = useNavigate();
    const [timeLeft, setTimeLeft] = useState(0);
    const [durationSeconds, setDurationSeconds] = useState(0);
    const [projectCase, setProjectCase] = useState(null);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [uploadError, setUploadError] = useState('');
    const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const timerRef = useRef(null);
    const fileInputRef = useRef(null);
    useEffect(() => {
        const session = getSession();
        if (!session || !session.projectTheme) {
            navigate('/participant/project-theme', { replace: true });
            return;
        }
        const init = async () => {
            try {
                const config = await apiGet('/api/config');
                const participantQuery = session.participantId ? `?participantId=${encodeURIComponent(session.participantId)}` : '';
                const caseData = await apiGet(`/api/project-themes/${session.projectTheme}/project-case${participantQuery}`);
                const durationMinutes = session.projectDurationMinutes || caseData.durationMinutes || config.projectDuration || 120;
                const totalSeconds = durationMinutes * 60;
                setDurationSeconds(totalSeconds);
                setProjectCase(caseData);
                if (!session.projectDurationMinutes && caseData.durationMinutes) {
                    updateSession({ projectDurationMinutes: caseData.durationMinutes });
                }
                if (session.participantId) {
                    await apiPost(`/api/participants/${session.participantId}/start-project`, {
                        projectTheme: session.projectTheme,
                    });
                }
                const savedTime = localStorage.getItem('project_timer');
                if (savedTime) {
                    const elapsed = Math.floor((Date.now() - parseInt(savedTime)) / 1000);
                    const remaining = totalSeconds - elapsed;
                    setTimeLeft(remaining > 0 ? remaining : 0);
                }
                else {
                    localStorage.setItem('project_timer', Date.now().toString());
                    setTimeLeft(totalSeconds);
                }
                timerRef.current = setInterval(() => {
                    setTimeLeft((prev) => {
                        if (prev <= 1) {
                            handleAutoSubmit();
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            }
            catch {
                setProjectCase(null);
                setTimeLeft(0);
            }
        };
        init();
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [navigate]);
    const handleAutoSubmit = async () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        updateSession({ status: 'completed' });
        const session = getSession();
        if (session?.participantId) {
            try {
                await apiPatch(`/api/participants/${session.participantId}`, {
                    status: 'completed',
                });
            }
            catch {
                // Ignore network errors during auto submit
            }
        }
        localStorage.removeItem('project_timer');
        navigate('/participant/complete', { replace: true });
    };
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setUploadError('');
        // Check file extension
        const extension = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!projectCase.allowedFormats.includes(extension)) {
            setUploadError(`Invalid file format. Allowed formats: ${projectCase.allowedFormats.join(', ')}`);
            return;
        }
        // Check file size (convert MB to bytes)
        const maxSizeBytes = projectCase.maxSize * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            setUploadError(`File size exceeds ${projectCase.maxSize}MB limit`);
            return;
        }
        setUploadedFile(file);
    };
    const handleSubmit = async () => {
        if (!uploadedFile) {
            setUploadError('Please upload your project file before submitting');
            return;
        }
        setIsSubmitDialogOpen(true);
    };
    const submitProject = async () => {
        const session = getSession();
        if (!session?.participantId) {
            setUploadError('Session not found. Please restart the exam.');
            return;
        }
      setIsSubmitting(true);
        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('themeId', session.projectTheme || '');
        formData.append('title', projectCase.title);
        try {
            await apiPost(`/api/participants/${session.participantId}/project-submissions`, formData);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        updateSession({ status: 'completed' });
        localStorage.removeItem('project_timer');
        navigate('/participant/complete', { replace: true });
        }
        catch (error) {
            setUploadError('Upload gagal. Coba lagi.');
        setIsSubmitting(false);
        }
    };
    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
            .toString()
            .padStart(2, '0')}`;
    };
    const formatFileSize = (bytes) => {
        const mb = bytes / (1024 * 1024);
        return mb.toFixed(2) + ' MB';
    };
    if (!projectCase) {
        return (<div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <p>Loading project...</p>
      </div>);
    }
    if (isSubmitting) {
        return (<div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <Paper elevation={3} sx={{ borderRadius: '16px', p: 4, width: '100%', maxWidth: 520 }}>
          <h2 className="text-xl text-gray-800 mb-2">Mengirim Proyek...</h2>
          <p className="text-sm text-gray-600 mb-4">Mohon tunggu sebentar, jawaban kamu sedang diproses.</p>
          <LinearProgress sx={{ height: 8, borderRadius: 4 }}/>
        </Paper>
      </div>);
    }
    const isTimeRunningOut = timeLeft < 600; // less than 10 minutes
    const timeProgress = durationSeconds ? ((durationSeconds - timeLeft) / durationSeconds) * 100 : 0;
    return (<div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <TechConfirmDialog open={isSubmitDialogOpen} title="Submit project file?" description="Your uploaded project will be sent for review and the participant flow will be completed. You cannot change the file after submission." confirmLabel="Submit Project" cancelLabel="Review File" intent="primary" onCancel={() => setIsSubmitDialogOpen(false)} onConfirm={() => {
        setIsSubmitDialogOpen(false);
        submitProject();
    }}/>

      <div className="max-w-4xl mx-auto py-8">
        {/* Timer Header */}
        <Paper elevation={3} sx={{ borderRadius: '16px', mb: 3, p: 3 }}>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl text-gray-800 mb-1">Project Assignment</h1>
              <p className="text-gray-600 text-sm">Complete your project and upload the files</p>
            </div>

            <div className="text-right">
              <div className={`flex items-center gap-2 mb-1 ${isTimeRunningOut ? 'text-red-600' : 'text-gray-800'}`}>
                <Clock className={`w-5 h-5 ${isTimeRunningOut ? 'animate-pulse' : ''}`}/>
                <span className="text-2xl">{formatTime(timeLeft)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <LinearProgress variant="determinate" value={timeProgress} sx={{ height: 8, borderRadius: 4 }}/>
          </div>

          {isTimeRunningOut && (<Alert severity="warning" sx={{ mt: 2 }}>
              Less than 10 minutes remaining! Upload will auto-close when time expires.
            </Alert>)}
        </Paper>

        {/* Project Case Study */}
        <Paper elevation={3} sx={{ borderRadius: '16px', p: 4, mb: 3 }}>
          <div className="mb-4">
            <Chip label="Case Study" color="primary" size="small"/>
          </div>

          <h2 className="text-2xl text-gray-800 mb-4">{projectCase.title}</h2>

          <div className="mb-6">
            <h3 className="text-lg text-gray-700 mb-2">Description</h3>
            <p className="text-gray-600 whitespace-pre-line">{projectCase.description}</p>
          </div>

          <div className="mb-6">
            <h3 className="text-lg text-gray-700 mb-2">Requirements</h3>
            <ul className="list-disc list-inside space-y-2">
              {projectCase.requirements.map((req, index) => (<li key={index} className="text-gray-600">
                  {req}
                </li>))}
            </ul>
          </div>

          <Alert severity="info">
            <strong>Work Instructions:</strong>
            <br />
            Complete your project on your local machine using your preferred tools and frameworks. Once finished,
            compress your project files and upload them below.
          </Alert>
        </Paper>

        {/* File Upload Section */}
        <Paper elevation={3} sx={{ borderRadius: '16px', p: 4, mb: 3 }}>
          <h3 className="text-xl text-gray-800 mb-4">Upload Your Project</h3>

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Allowed formats:</strong> {projectCase.allowedFormats.join(', ')}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Maximum file size:</strong> {projectCase.maxSize} MB
            </p>
          </div>

          <input ref={fileInputRef} type="file" onChange={handleFileSelect} accept={projectCase.allowedFormats.join(',')} className="hidden"/>

          {!uploadedFile ? (<div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
              <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4"/>
              <p className="text-gray-600 mb-2">Click to select file or drag and drop</p>
              <p className="text-sm text-gray-500">
                {projectCase.allowedFormats.join(', ')} up to {projectCase.maxSize}MB
              </p>
            </div>) : (<div className="border-2 border-green-300 bg-green-50 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-600 rounded-lg">
                  <FileText className="w-8 h-8 text-white"/>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-5 h-5 text-green-600"/>
                    <h4 className="text-lg text-gray-800">File Ready for Upload</h4>
                  </div>
                  <p className="text-gray-700 mb-1">{uploadedFile.name}</p>
                  <p className="text-sm text-gray-600">{formatFileSize(uploadedFile.size)}</p>
                </div>
                <Button variant="outlined" onClick={() => {
                setUploadedFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }} sx={{ borderRadius: '8px', textTransform: 'none' }}>
                  Change File
                </Button>
              </div>
            </div>)}

          {uploadError && (<Alert severity="error" sx={{ mt: 2 }}>
              {uploadError}
            </Alert>)}
        </Paper>

        {/* Submit Button */}
        <div className="flex justify-center">
          <Button variant="contained" size="large" endIcon={<Send />} onClick={handleSubmit} disabled={!uploadedFile} sx={{
            backgroundColor: '#16a34a',
            '&:hover': { backgroundColor: '#15803d' },
            borderRadius: '12px',
            textTransform: 'none',
            fontSize: '16px',
            padding: '14px 48px',
            '&:disabled': {
                backgroundColor: '#cbd5e1',
            },
        }}>
            Submit Project
          </Button>
        </div>
      </div>
    </div>);
}
