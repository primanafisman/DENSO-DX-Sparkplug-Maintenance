export function success(res,data,message='OK',status=200){return res.status(status).json({success:true,message,data,request_id:res.locals.requestId});}
