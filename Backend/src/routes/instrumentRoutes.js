import {Router} from 'express';
import {authorize} from '../middleware/authorize.js';
import {csrf} from '../middleware/csrf.js';
import {validate} from '../middleware/validate.js';
import {instrumentInput,instrumentStatusInput,calibrationInput} from '../validations/instrumentValidation.js';
import {instrumentHistory as historyInput} from '../validations/readingValidation.js';
import {instrumentController} from '../controllers/instrumentController.js';
export function instrumentRoutes(dependencies,authenticated,service){const router=Router(),controller=instrumentController(service);router.use(authenticated,csrf(dependencies.config));router.get('/',validate(historyInput,'query'),controller.list);router.get('/:id',controller.get);router.post('/',authorize('Admin'),validate(instrumentInput),controller.create);router.put('/:id/status',authorize('Admin'),validate(instrumentStatusInput),controller.status);router.put('/:id',authorize('Admin'),validate(instrumentInput),controller.update);router.get('/:id/calibrations',controller.calibrations);router.post('/:id/calibrations',authorize('Admin'),validate(calibrationInput),controller.calibration);return router;}
