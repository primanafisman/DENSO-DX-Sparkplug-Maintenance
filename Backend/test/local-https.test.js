import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import https from 'node:https';
import {X509Certificate} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadConfig} from '../src/config/runtime.js';

const root=fileURLToPath(new URL('..',import.meta.url));
const python=process.env.SPM_CERT_PYTHON||path.join(root,'cv_engine','.venv',process.platform==='win32'?'Scripts/python.exe':'bin/python');
const env={JWT_SECRET:'j'.repeat(32),CV_INTERNAL_TOKEN:'c'.repeat(32),NODE_ENV:'test'};
async function temporary(t){const directory=await fs.mkdtemp(path.join(os.tmpdir(),'spm-https-'));t.after(()=>fs.rm(directory,{recursive:true,force:true}));return directory;}
function generate(directory,...addresses){const result=spawnSync(python,[path.join(root,'scripts','generate-camera-certificate.py'),'--directory',directory,...addresses.flatMap(ip=>['--ip',ip])],{encoding:'utf8',timeout:30000});assert.equal(result.status,0,result.stderr||result.error?.message);return result;}
async function tlsFiles(directory){return {enabled:true,port:0,certFile:path.join(directory,'server-cert.pem'),keyFile:path.join(directory,'server-key.pem'),caFile:path.join(directory,'ca-cert.pem')};}
function request(port,{secure=false,ca,servername}={}){return new Promise((resolve,reject)=>{const response=(secure?https:http).get({hostname:'127.0.0.1',port,path:'/health',agent:false,...(secure?{ca,servername}:{})},res=>{let body='';res.setEncoding('utf8');res.on('data',chunk=>body+=chunk);res.on('end',()=>resolve({status:res.statusCode,body}));});response.on('error',reject);});}

test('local HTTPS is opt-in and rejects colliding ports',()=>{
  assert.equal(loadConfig(env).https?.enabled,false);
  const enabled=loadConfig({...env,SPM_HTTPS_ENABLED:'1',SPM_HTTPS_PORT:'8443'});
  assert.equal(enabled.https.enabled,true);assert.equal(enabled.https.port,8443);
  assert.throws(()=>loadConfig({...env,SPM_HTTPS_ENABLED:'1',SPM_HTTPS_PORT:'8100'}),/port/i);
  assert.throws(()=>loadConfig({...env,SPM_HTTPS_ENABLED:'1',SPM_HTTPS_PORT:'8101'}),/port/i);
});

test('camera certificate renews LAN identities while retaining the trusted CA',async t=>{
  const directory=await temporary(t);generate(directory,'10.117.172.18');
  const ca=new X509Certificate(await fs.readFile(path.join(directory,'ca-cert.pem')));
  const first=new X509Certificate(await fs.readFile(path.join(directory,'server-cert.pem')));
  assert.equal(ca.ca,true);assert.equal(first.ca,false);assert.equal(first.verify(ca.publicKey),true);
  assert.equal(first.checkIP('10.117.172.18'),'10.117.172.18');assert.equal(first.checkIP('127.0.0.1'),'127.0.0.1');assert.equal(first.checkHost('localhost'),'localhost');
  assert.equal(first.checkIP('10.117.172.19'),undefined);
  assert.ok(Date.parse(first.validTo)-Date.parse(first.validFrom)<398*86400000);
  generate(directory,'10.117.172.19');
  const renewed=new X509Certificate(await fs.readFile(path.join(directory,'server-cert.pem')));
  assert.equal(new X509Certificate(await fs.readFile(path.join(directory,'ca-cert.pem'))).fingerprint256,ca.fingerprint256);
  assert.equal(renewed.checkIP('10.117.172.19'),'10.117.172.19');assert.equal(renewed.checkIP('10.117.172.18'),undefined);
  assert.equal(renewed.verify(ca.publicKey),true);
});

test('the same application answers HTTP and trusted HTTPS and shutdown releases both ports',async t=>{
  const directory=await temporary(t);generate(directory,'10.117.172.18');
  const {startListeners}=await import('../src/server.js');
  assert.equal(typeof startListeners,'function','The server must own both listener lifecycles.');
  const listeners=await startListeners((req,res)=>res.end('same app'),{host:'127.0.0.1',port:0,https:await tlsFiles(directory)});
  t.after(()=>listeners.close());
  const httpPort=listeners.server.address().port,httpsPort=listeners.httpsServer.address().port,ca=await fs.readFile(path.join(directory,'ca-cert.pem'));
  assert.deepEqual(await request(httpPort),{status:200,body:'same app'});
  assert.deepEqual(await request(httpsPort,{secure:true,ca}),{status:200,body:'same app'});
  await assert.rejects(request(httpsPort,{secure:true,ca,servername:'wrong.invalid'}),{code:'ERR_TLS_CERT_ALTNAME_INVALID'});
  await listeners.close();
  await assert.rejects(request(httpPort),{code:'ECONNREFUSED'});
  await assert.rejects(request(httpsPort,{secure:true,ca}),{code:'ECONNREFUSED'});
});

test('an occupied HTTPS port rolls back the HTTP listener',async t=>{
  const directory=await temporary(t);generate(directory,'10.117.172.18');
  const {startListeners}=await import('../src/server.js');
  assert.equal(typeof startListeners,'function');
  const occupied=http.createServer();await new Promise(resolve=>occupied.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>occupied.close(resolve)));
  const spare=http.createServer();await new Promise(resolve=>spare.listen(0,'127.0.0.1',resolve));const httpPort=spare.address().port;await new Promise(resolve=>spare.close(resolve));
  await assert.rejects(startListeners((req,res)=>res.end('fixture'),{host:'127.0.0.1',port:httpPort,https:{...await tlsFiles(directory),port:occupied.address().port}}),{code:'EADDRINUSE'});
  await assert.rejects(request(httpPort),{code:'ECONNREFUSED'});
});

test('Windows setup retains existing secrets and prepares explicit HTTPS LAN origins', {skip:process.platform!=='win32'},async t=>{
  const directory=await temporary(t);await fs.mkdir(path.join(directory,'scripts'));
  for(const name of ['common.ps1','process-control.ps1','runtime-tools.ps1'])await fs.copyFile(path.join(root,'scripts',name),path.join(directory,'scripts',name));
  await fs.writeFile(path.join(directory,'.env'),'JWT_SECRET=fixture-secret-kept\nNODE_ENV=development\nSPM_LAN_ENABLED=1\nPORT=8100\nCORS_ORIGINS=http://127.0.0.1:8100\nSPM_HTTPS_ENABLED=1\nSPM_HTTPS_PORT=8443\n');
  const script=path.join(directory,'verify.ps1');
  await fs.writeFile(script,". (Join-Path $PSScriptRoot 'scripts/common.ps1')\nfunction Get-SpmLanAddresses {return @('10.117.172.18')}\nImport-SpmEnv\nSet-SpmEnvValues @{SPM_HTTPS_PORT='8444';SPM_TLS_CA='runtime/tls/ca-cert.pem'}\nWrite-Output $env:CORS_ORIGINS\n");
  const result=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',script],{encoding:'utf8',timeout:15000});
  assert.equal(result.status,0,result.stderr);const origins=result.stdout.trim().split(',');
  for(const origin of ['http://127.0.0.1:8100','http://10.117.172.18:8100','https://127.0.0.1:8443','https://localhost:8443','https://10.117.172.18:8443'])assert.ok(origins.includes(origin),origin);
  const contents=await fs.readFile(path.join(directory,'.env'),'utf8');
  assert.match(contents,/JWT_SECRET=fixture-secret-kept/);assert.match(contents,/SPM_HTTPS_PORT=8444/);assert.match(contents,/SPM_TLS_CA=runtime\/tls\/ca-cert.pem/);
  assert.equal(contents.match(/SPM_HTTPS_PORT=/g).length,1);
});
