import { Router } from 'express';
import * as controller from '../controllers/centre.controller';
import { validateBody } from '../middleware/validateBody';
import { createCentreSchema } from '../validators/centre.validator';

const router = Router();
router.post('/', validateBody(createCentreSchema), controller.createCentre);
router.get('/', controller.listCentres);
router.get('/:id', controller.getCentre);
export default router;