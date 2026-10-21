import {success} from '../utils/envelope.js';
export function photoController(photos,analyses){return {
  upload:async(req,res)=>success(res,await photos.upload({bytes:req.file?.buffer,mimeType:req.file?.mimetype,context:req.validated.body.context,actor:req.actor}),'Photo uploaded.',201),
  discover:async(req,res)=>success(res,await analyses.discover(req.params.id,req.validated.body,req.actor)),
  submit:async(req,res)=>success(res,await analyses.submit(req.validated.body,req.actor),'Analysis queued.',202),
  manual:async(req,res)=>success(res,await analyses.manual(req.validated.body,req.actor),'Manual photo review ready.',201),
  poll:async(req,res)=>success(res,await analyses.getJob(req.params.id,req.actor)),
  crop:async(req,res)=>{const image=await photos.crop(req.params.id,req.validated.body,req.actor);res.set('Cache-Control','private, no-store').type(image.mimeType).send(image.bytes);},
};}
