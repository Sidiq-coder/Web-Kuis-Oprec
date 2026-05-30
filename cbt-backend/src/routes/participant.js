import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { createParticipant, getParticipantStatus, updateParticipant, saveAnswer, startExam, startProject, submitProject, } from '../controllers/participantController.js';
const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, path.join(__dirname, '..', '..', uploadDir));
    },
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `${unique}${ext}`);
    },
});
const upload = multer({ storage });
router.post('/participants', createParticipant);
router.get('/participants/:participantId/status', getParticipantStatus);
router.patch('/participants/:participantId', updateParticipant);
router.post('/participants/:participantId/answers', saveAnswer);
router.post('/participants/:participantId/start-exam', startExam);
router.post('/participants/:participantId/start-project', startProject);
router.post('/participants/:participantId/project-submissions', upload.single('file'), submitProject);
export default router;
