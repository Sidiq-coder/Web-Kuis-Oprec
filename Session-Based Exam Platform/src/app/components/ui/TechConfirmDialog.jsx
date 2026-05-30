import { Button, Dialog, DialogContent } from '@mui/material';
import { AlertTriangle, Braces, Code2, TerminalSquare } from 'lucide-react';

export default function TechConfirmDialog({
    open,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    intent = 'primary',
    onCancel,
    onConfirm,
}) {
    const isDanger = intent === 'danger';
    const actionColor = isDanger ? '#dc2626' : '#1e5ba8';
    const actionHover = isDanger ? '#b91c1c' : '#164a8f';

    return (<Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth PaperProps={{
        sx: {
            borderRadius: '18px',
            overflow: 'hidden',
            border: `1px solid ${isDanger ? 'rgba(220, 38, 38, 0.26)' : 'rgba(30, 91, 168, 0.26)'}`,
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
          <div className="absolute inset-x-0 top-0 h-1.5" style={{
            background: isDanger
                ? 'linear-gradient(90deg, #dc2626, #f97316, #facc15)'
                : 'linear-gradient(90deg, #164a8f, #1e5ba8, #45a6e8)',
        }}/>
          <div className="absolute right-5 top-5 grid grid-cols-3 gap-1 opacity-45">
            {Array.from({ length: 9 }).map((_, index) => (<div key={index} className="h-3 w-3 rounded-[3px] border border-[#1e5ba8]/25 bg-[#1e5ba8]/12"/>))}
          </div>
          <div className="absolute bottom-5 right-6 font-mono text-3xl font-semibold text-[#1e5ba8]/10">&lt;/&gt;</div>

          <div className="relative">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg text-white shadow-lg shadow-blue-900/20" style={{ backgroundColor: actionColor }}>
                {isDanger ? <AlertTriangle className="h-5 w-5"/> : <TerminalSquare className="h-5 w-5"/>}
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-md border border-[#1e5ba8]/20 bg-[#1e5ba8]/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#1e5ba8]">
                  <Code2 className="h-3.5 w-3.5"/>
                  confirm.action
                </div>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">{title}</h2>
              </div>
            </div>

            <div className="rounded-md border border-[#1e5ba8]/15 bg-[#f5fbff] p-4">
              <p className="mb-1 font-mono text-xs font-semibold text-[#1e5ba8]">const next_step =</p>
              <p className="text-sm leading-6 text-slate-700">{description}</p>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-md border border-[#1e5ba8]/15 bg-white/55 px-3 py-2 font-mono text-xs text-slate-600">
              <Braces className="h-4 w-4 text-[#1e5ba8]"/>
              <span>locked: true, editable: false</span>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button onClick={onCancel} variant="outlined" sx={{
            borderRadius: '10px',
            textTransform: 'none',
            borderColor: 'rgba(30, 91, 168, 0.28)',
            color: '#1e5ba8',
            px: 2.5,
            '&:hover': { borderColor: '#1e5ba8', backgroundColor: '#eef7ff' },
        }}>
                {cancelLabel}
              </Button>
              <Button onClick={onConfirm} variant="contained" sx={{
            borderRadius: '10px',
            textTransform: 'none',
            fontWeight: 700,
            backgroundColor: actionColor,
            px: 2.5,
            '&:hover': { backgroundColor: actionHover },
        }}>
                {confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>);
}
