import {Router} from 'express';
import {authorize} from '../middleware/authorize.js';
import {csrf} from '../middleware/csrf.js';
import {validate} from '../middleware/validate.js';
import {confirmInput,readingHistory as historyInput} from '../validations/readingValidation.js';
import {readingController} from '../controllers/readingController.js';
import {createExportService} from '../services/exportService.js';
import {exportController} from '../controllers/exportController.js';
export function readingRoutes(dependencies,authenticated,service){const router=Router(),controller=readingController(service);router.use(authenticated,csrf(dependencies.config));router.get('/',validate(historyInput,'query'),controller.list);router.get('/export.csv',validate(historyInput,'query'),exportController(createExportService(service)));router.post('/confirm',authorize('Admin','Operator'),validate(confirmInput),controller.confirm);router.get('/:id/evidence/:variant',controller.evidence);return router;}
