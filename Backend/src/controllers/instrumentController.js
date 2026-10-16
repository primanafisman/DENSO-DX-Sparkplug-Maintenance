import {success} from '../utils/envelope.js';
import {publicCalibration} from '../sanitizers/calibrationSanitizer.js';
export function instrumentController(service){return {
  list:async(req,res)=>success(res,await service.list(req.validated.query)),get:async(req,res)=>success(res,await service.get(req.params.id)),
  create:async(req,res)=>success(res,await service.create(req.validated.body,req.actor),'Equipment created.',201),update:async(req,res)=>success(res,await service.update(req.params.id,req.validated.body,req.actor)),
  calibrations:async(req,res)=>{const page=await service.calibrations(req.params.id);return success(res,{...page,items:page.items.map(publicCalibration)});},
  calibration:async(req,res)=>success(res,await service.createCalibration(req.params.id,req.validated.body,req.actor),'Calibration created.',201),
};}
