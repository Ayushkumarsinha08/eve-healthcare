import { Router } from 'express';
import * as controller from '../controllers/payment.controller';
import { authenticate } from '../middleware/authenticate';
import { validateBody } from '../middleware/validateBody';
import { createPaymentSchema, paymentWebhookSchema } from '../validators/payment.validator';

const router = Router();
router.post('/webhook', validateBody(paymentWebhookSchema), controller.paymentWebhook);
router.post('/', authenticate, validateBody(createPaymentSchema), controller.createPayment);
export default router;