import {Router} from 'express';
import multer from 'multer';
import {authorize} from '../middleware/authorize.js';
import {csrf} from '../middleware/csrf.js';
import {validate} from '../middleware/validate.js';
import {AppError} from '../errors/AppError.js';
import {photoInput,discoveryInput,jobInput,roi,manualAnalysisInput} from '../validations/sharedValidation.js';
import {photoController} from '../controllers/photoController.js';
export function photoRoutes(dependencies,authenticated,photos,analyses){const router=Router(),controller=photoController(photos,analyses);router.use(authenticated,csrf(dependencies.config));const write=authorize('Admin','Operator');const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:15*1024*1024,files:1,fields:1,fieldSize:4096,parts:3}}).single('image');
  router.post('/photos',write,(req,res,next)=>upload(req,res,err=>next(err?new AppError(err.code==='LIMIT_FILE_SIZE'?413:422,'UPLOAD_INVALID','Check image and upload size.'):undefined)),(req,res,next)=>{try{req.body={...req.body,context:JSON.parse(req.body.context)};next();}catch{next(new AppError(422,'CONTEXT_REQUIRED','Upload requires production context.'));}},validate(photoInput),controller.upload);
  router.post('/photos/:id/discovery',write,validate(discoveryInput),controller.discover);
  router.post('/photos/:id/crop',write,validate(roi),controller.crop);
  router.post('/analysis-jobs',write,validate(jobInput),controller.submit);
  router.post('/analysis-jobs/manual',write,validate(manualAnalysisInput),controller.manual);
  router.get('/analysis-jobs/:id',controller.poll);return router;
}
