import {success} from '../utils/envelope.js';
import {cookieOptions,issueCsrf} from '../middleware/csrf.js';
import {SESSION_COOKIE,CSRF_COOKIE} from '../constants/authConstants.js';
import {publicUser} from '../sanitizers/authSanitizer.js';
export function authController(service,config){return {
  login:async(req,res)=>{const result=await service.login(req.validated.body);res.cookie(SESSION_COOKIE,result.token,cookieOptions(config));issueCsrf(config,result.actor,res);return success(res,result.user);},
  token:async(req,res)=>{const result=await service.login(req.validated.body);return success(res,{access_token:result.token,token_type:'Bearer',expires_in:config.sessionSeconds,user:result.user});},
  csrf:(req,res)=>success(res,{csrf_token:issueCsrf(config,req.actor,res)}),
  me:(req,res)=>success(res,publicUser(req.actor)),
  logout:(req,res)=>{service.logout(req.actor);for(const cookie of [SESSION_COOKIE,CSRF_COOKIE])res.clearCookie(cookie,{...cookieOptions(config),maxAge:undefined});return success(res,{signed_out:true});},
};}
