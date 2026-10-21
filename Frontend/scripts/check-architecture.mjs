import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export async function checkArchitecture(root){
  const errors=[];
  async function scan(folder){for(const entry of await fs.readdir(folder,{withFileTypes:true})){const file=path.join(folder,entry.name);if(entry.isDirectory())await scan(file);else if(/\.[jt]sx?$/.test(file)&&file.split(path.sep).includes('view')){const source=await fs.readFile(file,'utf8');if(/\bfetch\s*\(|from\s+['"][^'"]*(?:axios|shared\/lib\/api|model\/api)['"]/.test(source))errors.push('View bypasses controller: '+path.relative(root,file));}}}
  await scan(path.join(root,'src'));return errors;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const errors=await checkArchitecture(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log('Feature MVC checks passed.');}
