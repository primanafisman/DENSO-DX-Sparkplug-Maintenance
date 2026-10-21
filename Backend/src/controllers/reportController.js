import {success} from '../utils/envelope.js';
export function reportController(reports,baselines,exports){return {
  summary:async(req,res)=>success(res,await reports.summary(req.validated.query)),
  checksheet:async(req,res)=>{const {limit,cursor,...scope}=req.validated.query;return success(res,await reports.checksheet(scope,{limit,cursor}));},
  spc:async(req,res)=>{const {baseline_id,...scope}=req.validated.query;const baseline=baseline_id?await baselines.get(baseline_id):null;const report=await reports.spc(scope,{method:baseline?.method});return success(res,baseline_id?await baselines.apply(report,baseline_id):report);},
  subgroups:async(req,res)=>{const {cohort_id,limit,cursor,baseline_id,...scope}=req.validated.query;const baseline=baseline_id?await baselines.get(baseline_id):null;if(baseline)await baselines.apply(await reports.spc(scope,{method:baseline.method}),baseline_id);return success(res,await reports.subgroups(scope,{cohort_id,limit,cursor,method:baseline?.method}));},
  export:async(req,res)=>{const {report_kind,baseline_id,...scope}=req.validated.query;res.set({'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="maintenance-report.csv"'});return res.send(await exports.export(scope,{report_kind,baseline_id}));},
  createBaseline:async(req,res)=>success(res,await baselines.create(req.validated.body,req.actor),'Baseline tersimpan.',201),
  baseline:async(req,res)=>success(res,await baselines.get(req.params.id)),
  baselines:async(req,res)=>success(res,await baselines.list(req.validated.query)),
};}
