import {Router} from 'express';
import {authorize} from '../middleware/authorize.js';
import {csrf} from '../middleware/csrf.js';
import {validate} from '../middleware/validate.js';
import {summaryQuery,checksheetQuery,spcQuery,subgroupQuery,exportQuery,baselineInput} from '../validations/reportValidation.js';
import {historyInput} from '../validations/readingValidation.js';
import {createReportService} from '../services/reportService.js';
import {createBaselineService} from '../services/baselineService.js';
import {createReportExportService} from '../services/reportExportService.js';
import {reportController} from '../controllers/reportController.js';
import {createDemoReportService,assertDemoRequest} from '../services/demoReportService.js';
import {success} from '../utils/envelope.js';
export function reportRoutes(deps,authenticated){
  const router=Router(),reports=createReportService(deps),baselines=createBaselineService(deps,reports),controller=reportController(reports,baselines,createReportExportService(reports,baselines));
  router.use(authenticated,csrf(deps.config),(req,res,next)=>{res.set('Cache-Control','no-store');next();});
  const demo=createDemoReportService(deps);
  router.get('/demo/report',validate(checksheetQuery,'query'),async(req,res)=>{assertDemoRequest(deps.config);const {limit,cursor,...scope}=req.validated.query;return success(res,await demo.checksheet(scope,{limit,cursor}));});
  router.get('/demo/spc',validate(spcQuery,'query'),async(req,res)=>{const {baseline_id,...scope}=req.validated.query;assertDemoRequest(deps.config,baseline_id);return success(res,await demo.spc(scope));});
  router.get('/demo/spc/subgroups',validate(subgroupQuery,'query'),async(req,res)=>{const {cohort_id,limit,cursor,baseline_id,...scope}=req.validated.query;assertDemoRequest(deps.config,baseline_id);return success(res,await demo.subgroups(scope,{cohort_id,limit,cursor}));});
  router.get('/summary',validate(summaryQuery,'query'),controller.summary);
  router.get('/report',validate(checksheetQuery,'query'),controller.checksheet);
  router.get('/spc/subgroups',validate(subgroupQuery,'query'),controller.subgroups);
  router.get('/spc',validate(spcQuery,'query'),controller.spc);
  router.get('/export.csv',validate(exportQuery,'query'),controller.export);
  router.get('/spc-baselines',validate(historyInput.pick({limit:true,cursor:true}),'query'),controller.baselines);
  router.post('/spc-baselines',authorize('Admin'),validate(baselineInput),controller.createBaseline);
  router.get('/spc-baselines/:id',controller.baseline);
  return router;
}
