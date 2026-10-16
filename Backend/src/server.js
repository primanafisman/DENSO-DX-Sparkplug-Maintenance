import {assertNodeVersion,loadConfig} from './config/runtime.js';
import {createLogger} from './config/logger.js';
import {createApp} from './app.js';
import {createRepositories} from './repositories/index.js';
import {CvClient} from './integrations/cv/client.js';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
export async function startListeners(app,config){
  const server=http.createServer(app);let httpsServer,closing;
  const close=()=>closing??=Promise.all([server,httpsServer].filter(Boolean).map(listener=>new Promise(resolve=>{if(!listener.listening)return resolve();listener.close(resolve);listener.closeIdleConnections();})));
  const listen=(listener,port)=>new Promise((resolve,reject)=>{const failed=error=>reject(error);listener.once('error',failed);listener.listen(port,config.host,()=>{listener.removeListener('error',failed);resolve();});});
  try{
    if(config.https?.enabled){const [cert,key]=await Promise.all([fs.readFile(config.https.certFile),fs.readFile(config.https.keyFile)]);httpsServer=https.createServer({cert,key,minVersion:'TLSv1.2'},app);}
    await listen(server,config.port);
    if(httpsServer)await listen(httpsServer,config.https.port);
  }catch(error){await close();throw error;}
  return {server,httpsServer,close};
}
export async function startServer(config){assertNodeVersion();const repositories=await createRepositories(config),logger=createLogger(config),cvClient=new CvClient(config);const app=createApp({config,repositories,logger,cvClient});let listeners;
  try{listeners=await startListeners(app,config);}catch(error){await repositories.close();logger.close();throw error;}
  let shuttingDown;const shutdown=()=>shuttingDown??=(async()=>{app.locals.services.analyses.close();app.locals.services.photos.close();await listeners.close();await repositories.close();logger.close();})();
  return {app,server:listeners.server,httpsServer:listeners.httpsServer,shutdown};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{try{process.loadEnvFile();}catch(error){if(error.code!=='ENOENT')throw error;}const config=loadConfig(),running=await startServer(config);console.log(`Sparkplug Maintenance: http://${config.host}:${config.port}`);if(config.https.enabled)console.log(`Local camera HTTPS: https://${config.host}:${config.https.port}`);for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>running.shutdown().then(()=>process.exit(0)));}catch{console.error('Startup failed. Check Node22, configuration, local camera certificates, reviewed database schema and port availability.');process.exitCode=1;}
}
