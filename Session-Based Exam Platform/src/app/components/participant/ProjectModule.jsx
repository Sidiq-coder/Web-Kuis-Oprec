import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Paper, Button, Alert, Chip, LinearProgress } from '@mui/material';
import { Clock, Upload, FileText, Send, CheckCircle } from 'lucide-react';
import { getSession, updateSession } from '../../utils/sessionManager';
import { apiGet, apiPatch, apiPost } from '../../utils/api';
import TechConfirmDialog from '../ui/TechConfirmDialog';
import AttachmentView from '../ui/AttachmentView';
export default function ProjectModule() {
    const navigate = useNavigate();
    const [currentProject, setCurrentProject] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [durationSeconds, setDurationSeconds] = useState(0);
    const [projectCase, setProjectCase] = useState(null);
    const [uploadedFiles, setUploadedFiles] = useState({});
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
    const getProjectCases = () => projectCase?.cases?.length ? projectCase.cases : projectCase ? [projectCase] : [];
    const getUploadKey = (item, index) => item.id || `project-${index}`;
    const handleFileSelect = (e, item, index) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setUploadError('');
        const uploadKey = getUploadKey(item, index);
        const allowedFormats = item.allowedFormats || projectCase.allowedFormats || [];
        const maxSize = item.maxSize || projectCase.maxSize || 0;
        // Check file extension
        const extension = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!allowedFormats.includes(extension)) {
            setUploadError(`Invalid file format for Project ${index + 1}. Allowed formats: ${allowedFormats.join(', ')}`);
            return;
        }
        // Check file size (convert MB to bytes)
        const maxSizeBytes = maxSize * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            setUploadError(`File size for Project ${index + 1} exceeds ${maxSize}MB limit`);
            return;
        }
        setUploadedFiles((prev) => ({ ...prev, [uploadKey]: file }));
    };
    const handleSubmit = async () => {
        const projectCases = getProjectCases();
        const missingIndex = projectCases.findIndex((item, index) => !uploadedFiles[getUploadKey(item, index)]);
        if (missingIndex !== -1) {
            setUploadError(`Please upload the file for Project ${missingIndex + 1} before submitting`);
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
        const projectCases = getProjectCases();
        try {
            await Promise.all(projectCases.map((item, index) => {
                const formData = new FormData();
                formData.append('file', uploadedFiles[getUploadKey(item, index)]);
                formData.append('themeId', session.projectTheme || '');
                formData.append('title', projectCases.length > 1 ? `Project ${index + 1}: ${item.title}` : item.title);
                return apiPost(`/api/participants/${session.participantId}/project-submissions`, formData);
            }));
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
    const projectCases = getProjectCases();
    const allUploadsReady = projectCases.length > 0 && projectCases.every((item, index) => uploadedFiles[getUploadKey(item, index)]);
    const activeProject = projectCases[currentProject] || projectCases[0];
    const activeUploadKey = activeProject ? getUploadKey(activeProject, currentProject) : '';
    const activeUploadedFile = uploadedFiles[activeUploadKey];
    const activeAllowedFormats = activeProject?.allowedFormats || projectCase.allowedFormats || [];
    const activeMaxSize = activeProject?.maxSize || projectCase.maxSize || 0;
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
              <p className="text-gray-600 text-sm">
                Project {currentProject + 1} of {projectCases.length}. Complete each project and upload its file.
              </p>
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
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Chip label={projectCases.length > 1 ? `${projectCases.length} Case Studies` : 'Case Study'} color="primary" size="small"/>
            <Chip label={`Project ${currentProject + 1} / ${projectCases.length}`} color="primary" variant="outlined" size="small"/>
          </div>

          <h2 className="text-2xl text-gray-800 mb-4">{activeProject?.title}</h2>

          <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
            <div className="mb-4">
              <h3 className="text-lg text-gray-700 mb-2">Description</h3>
              <p className="text-gray-600 whitespace-pre-line">{activeProject?.description}</p>
            </div>
            <div>
              <h3 className="text-lg text-gray-700 mb-2">Requirements</h3>
              <ul className="list-disc list-inside space-y-2">
                {(activeProject?.requirements || []).map((req, index) => (<li key={index} className="text-gray-600">
                    {req}
                  </li>))}
              </ul>
            </div>
          </div>
          <AttachmentView item={activeProject} className="mb-6"/>

          {projectCases.length > 1 && (<div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
              <p className="mb-3 text-sm font-semibold text-gray-700">Project Navigator</p>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
                {projectCases.map((item, index) => {
                    const isCurrent = index === currentProject;
                    const isUploaded = Boolean(uploadedFiles[getUploadKey(item, index)]);
                    return (<button key={getUploadKey(item, index)} type="button" onClick={() => setCurrentProject(index)} className={`h-10 rounded-lg border text-sm font-semibold transition ${isCurrent
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : isUploaded
                            ? 'border-green-300 bg-green-50 text-green-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50'}`}>
                        {index + 1}
                      </button>);
                })}
              </div>
            </div>)}

          <Alert severity="info">
            <strong>Work Instructions:</strong>
            <br />
            Complete the active project on your local machine. Use Next/Previous to move between projects and upload each project file separately.
          </Alert>
        </Paper>

        {/* File Upload Section */}
        <Paper elevation={3} sx={{ borderRadius: '16px', p: 4, mb: 3 }}>
          <h3 className="text-xl text-gray-800 mb-4">Upload File for Project {currentProject + 1}</h3>

          <div className="mb-3">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Chip label={`Project ${currentProject + 1}`} color="primary" size="small" variant="outlined"/>
              <h4 className="text-lg text-gray-800">{activeProject?.title}</h4>
            </div>
            <p className="text-sm text-gray-600">
              Allowed formats: {activeAllowedFormats.join(', ')} · Maximum file size: {activeMaxSize} MB
            </p>
          </div>

          <input ref={fileInputRef} id={`project-file-${activeUploadKey}`} type="file" onChange={(event) => handleFileSelect(event, activeProject, currentProject)} accept={activeAllowedFormats.join(',')} className="hidden"/>

          {!activeUploadedFile ? (<label htmlFor={`project-file-${activeUploadKey}`} className="block cursor-pointer rounded-xl border-2 border-dashed border-gray-300 p-10 text-center transition-all hover:border-blue-500 hover:bg-blue-50">
              <Upload className="mx-auto mb-3 h-14 w-14 text-gray-400"/>
              <p className="text-gray-600">Click to select file for Project {currentProject + 1}</p>
            </label>) : (<div className="rounded-xl border-2 border-green-300 bg-green-50 p-5">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-green-600 p-3">
                  <FileText className="h-7 w-7 text-white"/>
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600"/>
                    <h5 className="text-gray-800">File Ready for Upload</h5>
                  </div>
                  <p className="mb-1 text-gray-700">{activeUploadedFile.name}</p>
                  <p className="text-sm text-gray-600">{formatFileSize(activeUploadedFile.size)}</p>
                </div>
                <Button variant="outlined" onClick={() => {
                    setUploadedFiles((prev) => {
                        const next = { ...prev };
                        delete next[activeUploadKey];
                        return next;
                    });
                    const input = document.getElementById(`project-file-${activeUploadKey}`);
                    if (input) {
                        input.value = '';
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

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outlined" disabled={currentProject === 0} onClick={() => setCurrentProject(currentProject - 1)} sx={{ borderRadius: '12px', textTransform: 'none', padding: '12px 28px' }}>
            Previous
          </Button>

          {currentProject === projectCases.length - 1 ? (<Button variant="contained" size="large" endIcon={<Send />} onClick={handleSubmit} disabled={!allUploadsReady} sx={{
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
          </Button>) : (<Button variant="contained" size="large" onClick={() => setCurrentProject(currentProject + 1)} sx={{
            backgroundColor: '#1e5ba8',
            '&:hover': { backgroundColor: '#174c93' },
            borderRadius: '12px',
            textTransform: 'none',
            fontSize: '16px',
            padding: '14px 48px',
        }}>
            Next
          </Button>)}
        </div>
      </div>
    </div>);
}
