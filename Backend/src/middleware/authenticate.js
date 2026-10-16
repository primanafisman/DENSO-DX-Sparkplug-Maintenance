import jwt from 'jsonwebtoken';
import {AppError} from '../errors/AppError.js';
import {SESSION_COOKIE} from '../constants/authConstants.js';
export function authenticate({config,repositories,revoked=new Map()}){return async(req,res,next)=>{
  try{
    const bearer=req.headers.authorization;
    if(bearer&&!/^Bearer [A-Za-z0-9_.-]+$/.test(bearer))throw new Error();
    const token=bearer?bearer.slice(7):req.cookies?.[SESSION_COOKIE];
    const claims=jwt.verify(token,config.jwtSecret,{algorithms:['HS256'],issuer:config.jwtIssuer,audience:config.jwtAudience});
    if(typeof claims.sub!=='string'||typeof claims.jti!=='string'||revoked.has(claims.jti))throw new Error();
    const user=await repositories.users.getById(claims.sub);
    if(!user?.active)throw new Error();
    req.actor={id:user.id,username:user.username,role:user.role,session_id:claims.jti,expires_at:claims.exp,auth_type:bearer?'bearer':'cookie'};next();
  }catch{next(new AppError(401,'AUTH_REQUIRED','Sign in again.'));}
};}
