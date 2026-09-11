import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../constants/index.js';
import {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
} from '../validators/user.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), UserController.getUsers);
router.get('/:id', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), UserController.getUserById);
router.post('/', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), validate(createUserSchema), UserController.createUser);
router.put('/:id', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), validate(updateUserSchema), UserController.updateUser);
router.patch('/:id/status', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), validate(updateUserStatusSchema), UserController.updateUserStatus);

export default router;
