import {AppError} from '../errors/AppError.js';
export function errorHandler(logger){return (err,req,res,next)=>{
  if(res.headersSent)return next(err);
  const known=err instanceof AppError;
  const status=known?err.status:err.type==='entity.too.large'?413:err.type==='entity.parse.failed'?400:500;
  logger?.error({message:'request_failed',request_id:res.locals.requestId,status,code:known?err.code:'INTERNAL_ERROR'});
  res.status(status).json({success:false,message:known?err.message:status===413?'Request too large.':status===400?'Malformed JSON.':'Request could not be completed.',code:known?err.code:status===413?'UPLOAD_LIMIT':status===400?'INVALID_JSON':'INTERNAL_ERROR',details:known?err.details:undefined,request_id:res.locals.requestId});
};}
