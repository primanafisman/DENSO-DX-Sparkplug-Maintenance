import {Router} from 'express';
import {z} from 'zod';
import {authorize} from '../middleware/authorize.js';
import {csrf} from '../middleware/csrf.js';
import {validate} from '../middleware/validate.js';
import {maintenanceInput,settingsInput,definitionUpdate} from '../validations/maintenanceValidation.js';
import {maintenanceHistory as historyInput} from '../validations/readingValidation.js';
import {maintenanceController} from '../controllers/maintenanceController.js';
const filters=z.object({group:z.string().max(80).optional(),kind:z.enum(['visual','functional','numeric','difference']).optional(),requirement:z.string().max(80).optional()}).strict();
export function maintenanceRoutes(dependencies,authenticated,service){const router=Router(),controller=maintenanceController(service);router.use(authenticated,csrf(dependencies.config));router.get('/schedule',controller.schedule);router.get('/catalog',validate(filters,'query'),controller.catalog);router.get('/settings',controller.settings);router.put('/settings',authorize('Admin'),validate(settingsInput),controller.updateSettings);router.get('/definitions/:id/revisions',authorize('Admin'),validate(historyInput.pick({limit:true,cursor:true}),'query'),controller.definitionRevisions);router.put('/definitions/:id',authorize('Admin'),validate(definitionUpdate),controller.updateDefinition);router.get('/records',validate(historyInput,'query'),controller.list);router.post('/records',authorize('Admin','Operator'),validate(maintenanceInput),controller.createRecord);return router;}
