import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function verifyModels(directory,manifest){
  manifest??=JSON.parse(await fs.readFile(path.join(root,'docs/governance/ocr-artifacts.json'),'utf8'));
  for(const artifact of manifest.artifacts){
    if(!/^[A-Za-z0-9_.-]+\.onnx$/.test(artifact.name))throw new Error('Invalid model manifest name.');
    const file=path.join(directory,artifact.name),stat=await fs.lstat(file);
    if(!stat.isFile()||stat.isSymbolicLink())throw new Error('Model integrity failed.');
    const bytes=await fs.readFile(file);
    if(bytes.length!==artifact.bytes||createHash('sha256').update(bytes).digest('hex')!==artifact.sha256)throw new Error('Model integrity failed: '+artifact.name);
  }
  return {verified:manifest.artifacts.length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    try{process.loadEnvFile();}catch(error){if(error.code!=='ENOENT')throw error;}
    const directory=path.resolve(root,process.env.OCR_MODEL_DIR||'cv_engine/models/ocr');
    const result=await verifyModels(directory);console.log('Offline OCR models verified: '+result.verified);
  }catch(error){console.error(error.code==='ENOENT'?'Offline OCR model bundle missing; extract the complete transfer package.':error.message);process.exitCode=1;}
}
