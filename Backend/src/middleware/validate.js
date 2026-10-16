import {AppError} from '../errors/AppError.js';
export function validate(schema,source='body'){return (req,res,next)=>{const parsed=schema.safeParse(req[source]);if(!parsed.success)return next(new AppError(422,'VALIDATION_ERROR','Check submitted fields.',parsed.error.issues.map(i=>({field:i.path.join('.'),message:i.message}))));req.validated={...req.validated,[source]:parsed.data};next();};}
