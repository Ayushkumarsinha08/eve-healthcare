import { Router } from 'express';
import * as controller from '../controllers/diagnosticTest.controller';
import { validateBody } from '../middleware/validateBody';
import { createDiagnosticTestSchema } from '../validators/diagnosticTest.validator';

const router = Router();
router.post('/', validateBody(createDiagnosticTestSchema), controller.createDiagnosticTest);
router.get('/', controller.listDiagnosticTests);
router.get('/:id', controller.getDiagnosticTest);
export default router;