import { Router } from 'express';
import publicRoutes from './public.js';
import participantRoutes from './participant.js';
import adminRoutes from './admin.js';
const router = Router();
router.use(publicRoutes);
router.use(participantRoutes);
router.use(adminRoutes);
export default router;
