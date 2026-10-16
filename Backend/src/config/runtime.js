import path from 'node:path';
import {z} from 'zod';
export function assertNodeVersion(version=process.versions.node){const [major,minor]=version.split('.').map(Number);if(major!==22||minor<12)throw new Error('Node >=22.12 <23 required.');}
export function loadConfig(env=process.env){
  const input=z.object({JWT_SECRET:z.string().min(32),CV_INTERNAL_TOKEN:z.string().min(32),NODE_ENV:z.enum(['development','test','production']).default('development'),PORT:z.coerce.number().int().min(1).max(65535).default(8100),HOST:z.string().default('127.0.0.1'),CV_URL:z.string().url().default('http://127.0.0.1:8101'),CORS_ORIGINS:z.string().default('http://127.0.0.1:8100'),RUNTIME_DIR:z.string().default('runtime'),DB_DIALECT:z.enum(['sqlite','mssql','mysql']).default('sqlite'),DB_STORAGE:z.string().optional(),DB_HOST:z.string().optional(),DB_PORT:z.coerce.number().int().optional(),DB_NAME:z.string().default('DX_SPM'),DB_USER:z.string().optional(),DB_PASSWORD:z.string().optional()}).parse(env);
  const tls=z.object({SPM_HTTPS_ENABLED:z.enum(['0','1']).default('0'),SPM_HTTPS_PORT:z.coerce.number().int().min(1).max(65535).default(8443),SPM_TLS_CERT:z.string().min(1).optional(),SPM_TLS_KEY:z.string().min(1).optional(),SPM_TLS_CA:z.string().min(1).optional()}).parse(env);
  const runtimeDir=path.resolve(input.RUNTIME_DIR),tlsDir=path.join(runtimeDir,'tls');
  const https={enabled:tls.SPM_HTTPS_ENABLED==='1',port:tls.SPM_HTTPS_PORT,certFile:path.resolve(tls.SPM_TLS_CERT||path.join(tlsDir,'server-cert.pem')),keyFile:path.resolve(tls.SPM_TLS_KEY||path.join(tlsDir,'server-key.pem')),caFile:path.resolve(tls.SPM_TLS_CA||path.join(tlsDir,'ca-cert.pem'))};
  if(https.enabled&&(https.port===input.PORT||https.port===Number(new URL(input.CV_URL).port)))throw new Error('HTTPS port must differ from HTTP and CV ports.');
  const origins=input.CORS_ORIGINS.split(',').map(s=>s.trim()).filter(Boolean);
  if(origins.some(o=>o==='*'||new URL(o).origin!==o))throw new Error('CORS requires explicit origin URLs.');
  if(input.NODE_ENV==='production'&&origins.some(o=>!o.startsWith('https://')))throw new Error('Production browser origins require HTTPS.');
  return {environment:input.NODE_ENV,port:input.PORT,host:input.HOST,https,jwtSecret:input.JWT_SECRET,internalToken:input.CV_INTERNAL_TOKEN,jwtIssuer:'SPM',jwtAudience:'SPM',sessionSeconds:3600,secureCookies:input.NODE_ENV==='production',origins,cvUrl:input.CV_URL,runtimeDir,ttlSeconds:900,maxJobs:5,database:{dialect:input.DB_DIALECT,storage:path.resolve(input.DB_STORAGE||path.join(input.RUNTIME_DIR,'development.sqlite')),host:input.DB_HOST,port:input.DB_PORT,database:input.DB_NAME,username:input.DB_USER,password:input.DB_PASSWORD}};
}
