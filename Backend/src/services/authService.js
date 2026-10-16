import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {randomUUID} from 'node:crypto';
import {AppError} from '../errors/AppError.js';
import {publicUser} from '../sanitizers/authSanitizer.js';
const dummyHash=await bcrypt.hash(randomUUID(),10);
export function createAuthService({config,repositories,revoked}){return {
  async login(input){const user=await repositories.users.findByUsername(input.username);const valid=await bcrypt.compare(input.password,user?.password_hash||dummyHash);if(!valid||!user?.active)throw new AppError(401,'LOGIN_FAILED','Username or password incorrect.');const sid=randomUUID();const token=jwt.sign({jti:sid},config.jwtSecret,{subject:user.id,algorithm:'HS256',issuer:config.jwtIssuer,audience:config.jwtAudience,expiresIn:config.sessionSeconds});return {user:publicUser(user),token,actor:{session_id:sid}};},
  logout(actor){const now=Date.now()/1000;for(const [id,exp] of revoked)if(exp<now)revoked.delete(id);revoked.set(actor.session_id,actor.expires_at);},
};}
