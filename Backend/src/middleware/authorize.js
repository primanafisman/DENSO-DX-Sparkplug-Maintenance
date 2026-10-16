import {AppError} from '../errors/AppError.js';
export function authorize(...roles){return (req,res,next)=>roles.includes(req.actor?.role)?next():next(new AppError(403,'ROLE_FORBIDDEN','Your role does not permit this action.'));}
