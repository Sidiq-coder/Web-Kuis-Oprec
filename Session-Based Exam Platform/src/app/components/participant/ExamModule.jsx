import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Paper, Button, Checkbox, Radio, RadioGroup, FormControlLabel, TextField, LinearProgress, Alert, Chip } from '@mui/material';
import { Braces, ChevronLeft, ChevronRight, Clock, Code2, Cpu, Save, Send, TerminalSquare } from 'lucide-react';
import { getSession, updateSession, autoSave } from '../../utils/sessionManager';
import { apiGet, apiPatch, apiPost } from '../../utils/api';
import TechConfirmDialog from '../ui/TechConfirmDialog';

export default function ExamModule() {
    const navigate = useNavigate();
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(0); // in seconds
    const [examQuestions, setExamQuestions] = useState([]);
    const [autoSaveStatus, setAutoSaveStatus] = useState('');
    const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
    const timerRef = useRef(null);
    const saveTimeoutRef = useRef(null);
    const answersRef = useRef({});

    useEffect(() => {
        const session = getSession();
        if (!session || !session.examTheme) {
            navigate('/participant/theme-selection', { replace: true });
            return;
        }
        const init = async () => {
            try {
                const config = await apiGet('/api/config');
                const activeThemes = await apiGet('/api/themes').catch(() => []);
                const selectedTheme = activeThemes.find((theme) => theme.id === session.examTheme);
                const durationMinutes = session.examDurationMinutes || selectedTheme?.durationMinutes || config.examDuration || 60;
                if (!session.examDurationMinutes && selectedTheme?.durationMinutes) {
                    updateSession({ examDurationMinutes: selectedTheme.durationMinutes });
                }
                const participantQuery = session.participantId ? `?participantId=${encodeURIComponent(session.participantId)}` : '';
                const themeQuestions = await apiGet(`/api/themes/${session.examTheme}/questions${participantQuery}`);
                setExamQuestions(themeQuestions);
                if (session.examAnswers) {
                    setAnswers(session.examAnswers);
                    answersRef.current = session.examAnswers;
                }
                if (session.participantId) {
                    await apiPost(`/api/participants/${session.participantId}/start-exam`, {
                        examTheme: session.examTheme,
                    });
                }
                const savedTime = localStorage.getItem('exam_timer');
                if (savedTime) {
                    const elapsed = Math.floor((Date.now() - parseInt(savedTime)) / 1000);
                    const remaining = durationMinutes * 60 - elapsed;
                    setTimeLeft(remaining > 0 ? remaining : 0);
                }
                else {
                    localStorage.setItem('exam_timer', Date.now().toString());
                    setTimeLeft(durationMinutes * 60);
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
                setExamQuestions([]);
                setTimeLeft(0);
            }
        };
        init();
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [navigate]);

    const handleAutoSubmit = async () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        const session = getSession();
        const currentAnswers = answersRef.current;
        updateSession({ examAnswers: currentAnswers, status: 'project-theme' });
        if (session?.participantId) {
            try {
                await Promise.all(Object.entries(currentAnswers).map(([questionId, answer]) => apiPost(`/api/participants/${session.participantId}/answers`, {
                    questionId,
                    answer,
                })));
                await apiPatch(`/api/participants/${session.participantId}`, {
                    status: 'project-theme',
                });
            }
            catch {
                // Ignore network errors during auto submit
            }
        }
        localStorage.removeItem('exam_timer');
        navigate('/participant/project-theme', { replace: true });
    };

    const handleAnswerChange = (questionId, value) => {
        const newAnswers = { ...answers, [questionId]: value };
        setAnswers(newAnswers);
        answersRef.current = newAnswers;
        autoSave(questionId, value);
        setAutoSaveStatus('Saving...');
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
            const session = getSession();
            if (session?.participantId) {
                apiPost(`/api/participants/${session.participantId}/answers`, {
                    questionId,
                    answer: value,
                }).catch(() => {
                    // Ignore transient errors to avoid blocking UI
                });
            }
        }, 400);
        setTimeout(() => {
            setAutoSaveStatus('Saved');
            setTimeout(() => setAutoSaveStatus(''), 2000);
        }, 1000);
    };

    const handleSubmit = () => {
        setIsSubmitDialogOpen(true);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = examQuestions.length ? ((currentQuestion + 1) / examQuestions.length) * 100 : 0;
    const question = examQuestions[currentQuestion];
    if (!question) {
        return (<div className="min-h-screen bg-gradient-to-br from-[#d9ecff] via-[#cfe7ff] to-[#b9dafb] flex items-center justify-center">
        <Paper elevation={0} sx={{
            borderRadius: '16px',
            border: '1px solid rgba(30, 91, 168, 0.24)',
            background: 'rgba(231, 243, 255, 0.94)',
            p: 3,
        }}>
          <div className="flex items-center gap-3 text-[#1e5ba8]">
            <TerminalSquare className="h-5 w-5"/>
            <p className="font-semibold">Loading exam module...</p>
          </div>
        </Paper>
      </div>);
    }

    const isAnswerFilled = (answer) => Array.isArray(answer) ? answer.length > 0 : answer !== undefined && answer !== '';
    const answeredCount = Object.values(answers).filter(isAnswerFilled).length;
    const isTimeRunningOut = timeLeft < 300; // less than 5 minutes
    const currentAnswer = answers[question.id];

    return (<div className="min-h-screen overflow-hidden bg-gradient-to-br from-[#d9ecff] via-[#cfe7ff] to-[#b9dafb] px-4 py-4 text-slate-900 sm:px-6 lg:px-8">
      <TechConfirmDialog open={isSubmitDialogOpen} title="Submit exam now?" description="Your answers will be locked and you will continue to the project theme selection. You cannot return to edit this exam after submission." confirmLabel="Submit Exam" cancelLabel="Review Answers" intent="primary" onCancel={() => setIsSubmitDialogOpen(false)} onConfirm={() => {
        setIsSubmitDialogOpen(false);
        handleAutoSubmit();
    }}/>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-6 top-8 grid grid-cols-4 gap-2 opacity-30">
          {Array.from({ length: 16 }).map((_, index) => (<div key={index} className="h-6 w-6 rounded border border-[#1e5ba8]/35 bg-[#1e5ba8]/10"/>))}
        </div>
        <div className="absolute bottom-14 right-10 grid grid-cols-5 gap-2 opacity-25">
          {Array.from({ length: 15 }).map((_, index) => (<div key={index} className="h-5 w-5 rounded-[3px] border border-[#1e5ba8]/30 bg-white/25"/>))}
        </div>
        <div className="absolute bottom-16 left-16 text-6xl font-semibold leading-none text-[#1e5ba8]/10">{'{ }'}</div>
        <div className="absolute right-24 top-28 text-5xl font-semibold leading-none text-[#1e5ba8]/10">&lt;/&gt;</div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(30,91,168,0.075)_1px,transparent_1px),linear-gradient(90deg,rgba(30,91,168,0.075)_1px,transparent_1px)] bg-[size:46px_46px]"/>
      </div>

      <div className="relative mx-auto max-w-6xl">
        <Paper elevation={0} sx={{
            borderRadius: '16px',
            border: '1px solid rgba(30, 91, 168, 0.26)',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(219,238,255,0.94))',
            boxShadow: '0 14px 34px rgba(30, 91, 168, 0.18)',
            backdropFilter: 'blur(16px)',
        }}>
          <div className="relative overflow-hidden rounded-[16px]">
            <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#1e5ba8] via-[#2f8bd3] to-cyan-400"/>
            <div className="absolute right-4 top-4 grid grid-cols-3 gap-1 opacity-45">
              {Array.from({ length: 9 }).map((_, index) => (<div key={index} className="h-3 w-3 rounded-[3px] bg-[#1e5ba8]/20"/>))}
            </div>
            <div className="flex flex-col gap-4 p-4 pl-6 lg:flex-row lg:items-center lg:justify-between lg:p-5 lg:pl-7">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-[#1e5ba8]/25 bg-[#1e5ba8]/14 px-2.5 py-1 text-xs font-semibold text-[#1e5ba8]">
                  <Cpu className="h-4 w-4"/>
                  Computer Based Test
                </div>
                <h1 className="text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">Exam Console</h1>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">
                  Question {currentQuestion + 1} of {examQuestions.length}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
                <div className={`rounded-md border px-3 py-2 ${isTimeRunningOut ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#1e5ba8]/20 bg-[#e9f4ff]/90 text-[#1e5ba8]'}`}>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase">
                    <Clock className={`h-4 w-4 ${isTimeRunningOut ? 'animate-pulse' : ''}`}/>
                    Timer
                  </div>
                  <p className="mt-1 font-mono text-xl font-semibold">{formatTime(timeLeft)}</p>
                </div>
                <div className="rounded-md border border-[#1e5ba8]/20 bg-[#e9f4ff]/90 px-3 py-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[#1e5ba8]">
                    <Braces className="h-4 w-4"/>
                    Answered
                  </div>
                  <p className="mt-1 text-xl font-semibold text-slate-950">{answeredCount}/{examQuestions.length}</p>
                </div>
                <div className="rounded-md border border-[#1e5ba8]/20 bg-[#e9f4ff]/90 px-3 py-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[#1e5ba8]">
                    <Save className="h-4 w-4"/>
                    Autosave
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-950">{autoSaveStatus || 'Ready'}</p>
                </div>
              </div>
            </div>

            <div className="px-5 pb-4 pl-6 sm:px-6 sm:pl-7">
              <div className="mb-2 flex justify-between text-xs font-semibold text-slate-600">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <LinearProgress variant="determinate" value={progress} sx={{
                height: 8,
                borderRadius: 8,
                backgroundColor: 'rgba(30, 91, 168, 0.14)',
                '& .MuiLinearProgress-bar': {
                    borderRadius: 8,
                    background: 'linear-gradient(90deg, #1e5ba8 0%, #2f8bd3 70%, #4bb8ef 100%)',
                },
            }}/>
            </div>
          </div>
        </Paper>

        {isTimeRunningOut && (<Alert severity="warning" sx={{ mt: 2, borderRadius: '12px' }}>
          Less than 5 minutes remaining. Exam will auto-submit when time expires.
        </Alert>)}

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
          <Paper elevation={0} sx={{
            borderRadius: '16px',
            border: '1px solid rgba(30, 91, 168, 0.22)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(230,243,255,0.92))',
            boxShadow: '0 12px 30px rgba(30, 91, 168, 0.15)',
            backdropFilter: 'blur(14px)',
        }}>
            <div className="relative overflow-hidden rounded-[16px] p-5 sm:p-6">
              <div className="absolute right-5 top-5 grid grid-cols-2 gap-1 opacity-50">
                {Array.from({ length: 4 }).map((_, index) => (<div key={index} className="h-3 w-3 rounded-[3px] bg-[#1e5ba8]/18"/>))}
              </div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Chip label={question.type === 'multiple-answer' ? 'Multiple Answers' : question.type === 'multiple-choice' ? 'Multiple Choice' : 'Essay'} size="small" sx={{
                bgcolor: '#1e5ba8',
                color: 'white',
                fontWeight: 700,
            }}/>
                {question.type === 'multiple-answer' && (<Chip label="Select more than one answer" size="small" sx={{
                    bgcolor: '#fef3c7',
                    color: '#92400e',
                    fontWeight: 700,
                }}/>)}
                <Chip label={`${question.weight} points`} size="small" sx={{
                bgcolor: 'rgba(30, 91, 168, 0.12)',
                color: '#1e5ba8',
                fontWeight: 700,
            }}/>
                <div className="ml-auto hidden items-center gap-2 rounded-md bg-[#1e5ba8]/10 px-2.5 py-1 text-xs font-semibold text-[#1e5ba8] sm:flex">
                  <Code2 className="h-4 w-4"/>
                  question.payload
                </div>
              </div>

              <div className="rounded-md border border-[#1e5ba8]/15 bg-[#f5fbff] p-4">
                <p className="mb-2 font-mono text-xs font-semibold text-[#1e5ba8]">const question_{currentQuestion + 1} =</p>
                <h2 className="text-lg font-semibold leading-8 text-slate-950 sm:text-xl">{question.question}</h2>
              </div>

              <div className="mt-4">
                {question.type === 'multiple-choice' ? (<RadioGroup value={currentAnswer ?? ''} onChange={(e) => handleAnswerChange(question.id, parseInt(e.target.value))}>
                  <div className="grid gap-3">
                    {question.options?.map((option, index) => {
                        const isChosen = currentAnswer === index;
                        return (<FormControlLabel key={index} value={index} control={<Radio sx={{
                            color: '#1e5ba8',
                            '&.Mui-checked': { color: '#1e5ba8' },
                        }}/>} label={<span className="text-sm leading-6 text-slate-700">{option}</span>} sx={{
                            m: 0,
                            p: '10px 12px',
                            borderRadius: '12px',
                            border: isChosen ? '2px solid #1e5ba8' : '1px solid rgba(30, 91, 168, 0.16)',
                            background: isChosen ? 'linear-gradient(135deg, #eef7ff, #dceeff)' : 'rgba(255,255,255,0.72)',
                            boxShadow: isChosen ? '0 10px 22px rgba(30, 91, 168, 0.16)' : 'none',
                            transition: 'border-color 140ms ease, background 140ms ease, transform 140ms ease',
                            '&:hover': {
                                background: '#eef7ff',
                                borderColor: '#4f93d0',
                                transform: 'translateY(-1px)',
                            },
                        }}/>);
                    })}
                  </div>
                </RadioGroup>) : question.type === 'multiple-answer' ? (<div className="grid gap-3">
                  {question.options?.map((option, index) => {
                    const selectedAnswers = Array.isArray(currentAnswer) ? currentAnswer : [];
                    const isChosen = selectedAnswers.includes(index);
                    return (<FormControlLabel key={index} control={<Checkbox checked={isChosen} onChange={(event) => {
                        const nextAnswers = event.target.checked
                            ? [...selectedAnswers, index].sort((a, b) => a - b)
                            : selectedAnswers.filter((answerIndex) => answerIndex !== index);
                        handleAnswerChange(question.id, nextAnswers);
                    }} sx={{
                        color: '#1e5ba8',
                        '&.Mui-checked': { color: '#1e5ba8' },
                    }}/>} label={<span className="text-sm leading-6 text-slate-700">{option}</span>} sx={{
                        m: 0,
                        p: '10px 12px',
                        borderRadius: '12px',
                        border: isChosen ? '2px solid #1e5ba8' : '1px solid rgba(30, 91, 168, 0.16)',
                        background: isChosen ? 'linear-gradient(135deg, #eef7ff, #dceeff)' : 'rgba(255,255,255,0.72)',
                    }}/>);
                  })}
                </div>) : (<TextField fullWidth multiline rows={7} placeholder="Type your answer here..." value={answers[question.id] || ''} onChange={(e) => handleAnswerChange(question.id, e.target.value)} variant="outlined" sx={{
                    '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                        backgroundColor: 'rgba(255,255,255,0.82)',
                        fontFamily: 'monospace',
                        '& fieldset': { borderColor: 'rgba(30, 91, 168, 0.22)' },
                        '&:hover fieldset': { borderColor: '#4f93d0' },
                        '&.Mui-focused fieldset': { borderColor: '#1e5ba8' },
                    },
                }}/>)}
              </div>
            </div>
          </Paper>

          <Paper elevation={0} sx={{
            borderRadius: '16px',
            border: '1px solid rgba(30, 91, 168, 0.22)',
            background: 'linear-gradient(180deg, rgba(240,248,255,0.96), rgba(220,238,255,0.92))',
            boxShadow: '0 12px 30px rgba(30, 91, 168, 0.14)',
            alignSelf: 'start',
        }}>
            <div className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1e5ba8]">Navigator</p>
                  <p className="text-sm text-slate-600">Jump to question</p>
                </div>
                <TerminalSquare className="h-5 w-5 text-[#1e5ba8]"/>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {examQuestions.map((item, index) => {
                    const isCurrent = index === currentQuestion;
                    const isAnswered = isAnswerFilled(answers[item.id]);
                    return (<button key={item.id || index} type="button" onClick={() => setCurrentQuestion(index)} className={`h-9 rounded-md border text-sm font-semibold transition ${isCurrent
                        ? 'border-[#1e5ba8] bg-[#1e5ba8] text-white shadow-md shadow-blue-900/20'
                        : isAnswered
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                            : 'border-[#1e5ba8]/18 bg-white/70 text-slate-600 hover:border-[#1e5ba8]/45 hover:bg-blue-50'}`}>
                      {index + 1}
                    </button>);
                })}
              </div>
              <div className="mt-4 rounded-md border border-[#1e5ba8]/15 bg-white/55 p-3 font-mono text-xs leading-6 text-slate-600">
                <p><span className="text-[#1e5ba8]">status</span>: autosave</p>
                <p><span className="text-[#1e5ba8]">mode</span>: protected_exam</p>
              </div>
            </div>
          </Paper>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outlined" startIcon={<ChevronLeft />} disabled={currentQuestion === 0} onClick={() => setCurrentQuestion(currentQuestion - 1)} sx={{
            borderRadius: '10px',
            textTransform: 'none',
            borderColor: 'rgba(30, 91, 168, 0.28)',
            color: '#1e5ba8',
            backgroundColor: 'rgba(255,255,255,0.58)',
            '&:hover': { borderColor: '#1e5ba8', backgroundColor: '#eef7ff' },
        }}>
            Previous
          </Button>

          {currentQuestion === examQuestions.length - 1 ? (<Button variant="contained" endIcon={<Send />} onClick={handleSubmit} sx={{
                background: 'linear-gradient(135deg, #16a34a 0%, #0f8f63 100%)',
                '&:hover': { background: 'linear-gradient(135deg, #15803d 0%, #0b7651 100%)' },
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 700,
                px: 3,
            }}>
              Submit Exam
            </Button>) : (<Button variant="contained" endIcon={<ChevronRight />} onClick={() => setCurrentQuestion(currentQuestion + 1)} sx={{
                background: 'linear-gradient(135deg, #1e5ba8 0%, #0f8fbd 100%)',
                '&:hover': { background: 'linear-gradient(135deg, #174c93 0%, #087ca8 100%)' },
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 700,
                px: 3,
            }}>
              Next
            </Button>)}
        </div>
      </div>
    </div>);
}
