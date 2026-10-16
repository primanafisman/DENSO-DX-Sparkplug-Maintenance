import {success} from '../utils/envelope.js';
export function readingController(service){return {
  confirm:async(req,res)=>success(res,await service.confirm(req.validated.body,req.actor),'Reading confirmed.',201),
  list:async(req,res)=>success(res,await service.list(req.validated.query)),
  evidence:async(req,res)=>{const content=await service.evidence(req.params.id,req.params.variant,req.actor);res.set('Cache-Control','private, no-store').type(content.mimeType).send(content.bytes);},
};}
