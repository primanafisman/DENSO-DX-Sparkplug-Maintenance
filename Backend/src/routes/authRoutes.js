import {Router} from 'express';
import {rateLimit} from 'express-rate-limit';
import {validate} from '../middleware/validate.js';
import {loginSchema} from '../validations/authValidation.js';
import {authController} from '../controllers/authController.js';
import {createAuthService} from '../services/authService.js';
import {csrf} from '../middleware/csrf.js';
import {AppError} from '../errors/AppError.js';
export function authRoutes(dependencies,authenticate){const router=Router();const controller=authController(createAuthService(dependencies),dependencies.config);const limiter=rateLimit({windowMs:60000,limit:20,standardHeaders:'draft-8',legacyHeaders:false,handler:(req,res,next)=>next(new AppError(429,'LOGIN_LIMIT','Please wait before trying again.'))});
  router.post('/login',limiter,validate(loginSchema),controller.login);
  router.post('/token',limiter,validate(loginSchema),controller.token);
  router.get('/csrf',authenticate,controller.csrf);router.get('/me',authenticate,controller.me);
  router.post('/logout',authenticate,csrf(dependencies.config),controller.logout);return router;
}
