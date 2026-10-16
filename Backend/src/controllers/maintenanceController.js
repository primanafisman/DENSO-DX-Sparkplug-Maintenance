import {success} from '../utils/envelope.js';
export function maintenanceController(service){return {
  schedule:async(req,res)=>{res.set('Cache-Control','no-store');return success(res,await service.schedule());},
  catalog:async(req,res)=>success(res,await service.catalog(req.validated.query)),settings:async(req,res)=>success(res,await service.getSettings()),
  updateSettings:async(req,res)=>success(res,await service.updateSettings(req.validated.body,req.actor)),
  updateDefinition:async(req,res)=>success(res,await service.updateDefinition(req.params.id,req.validated.body,req.actor)),
  createRecord:async(req,res)=>success(res,await service.createRecord(req.validated.body,req.actor),'Maintenance saved.',201),
  list:async(req,res)=>success(res,await service.list(req.validated.query)),
};}
