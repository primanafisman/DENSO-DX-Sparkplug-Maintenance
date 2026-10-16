import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {AppError} from '../errors/AppError.js';
import {CSRF_COOKIE} from '../constants/authConstants.js';
export function cookieOptions(config,httpOnly=true){return {httpOnly,secure:config.secureCookies,sameSite:'lax',path:'/',maxAge:config.sessionSeconds*1000};}
function signature(config,sid,nonce){return createHmac('sha256',config.jwtSecret).update(`csrf:${sid}:${nonce}`).digest('base64url');}
export function issueCsrf(config,actor,res){const nonce=randomBytes(24).toString('base64url');const token=nonce+'.'+signature(config,actor.session_id,nonce);res.cookie(CSRF_COOKIE,token,cookieOptions(config,false));return token;}
export function csrf(config){return(req,res,next)=>{
  if(['GET','HEAD','OPTIONS'].includes(req.method)||req.actor?.auth_type==='bearer')return next();
  const header=req.get('X-CSRF-Token'),cookie=req.cookies?.[CSRF_COOKIE];
  const [nonce,sig]=typeof header==='string'?header.split('.'):[];
  const expected=nonce&&req.actor?signature(config,req.actor.session_id,nonce):'';
  if(!header||header!==cookie||!sig||sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return next(new AppError(403,'CSRF_INVALID','Reload the form and retry.'));
  next();
};}
