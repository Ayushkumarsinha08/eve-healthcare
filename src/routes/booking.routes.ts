import { Router } from 'express';
import * as controller from '../controllers/booking.controller';
import { authenticate } from '../middleware/authenticate';
import { validateBody } from '../middleware/validateBody';
import { createBookingSchema } from '../validators/booking.validator';

const router = Router();
router.use(authenticate);
router.post('/', validateBody(createBookingSchema), controller.createBooking);
router.get('/', controller.listBookings);
router.get('/:id', controller.getBooking);
router.delete('/:id', controller.cancelBooking);
export default router;