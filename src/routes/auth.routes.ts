import { Router } from 'express';
import { login, signup } from '../controllers/auth.controller';
import { validateBody } from '../middleware/validateBody';
import { loginSchema, signupSchema } from '../validators/auth.validator';

const router = Router();
router.post('/signup', validateBody(signupSchema), signup);
router.post('/login', validateBody(loginSchema), login);
export default router;