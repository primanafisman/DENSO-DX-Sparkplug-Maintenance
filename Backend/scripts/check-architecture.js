import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const layers=['config','constants','routes','sanitizers','validations','middleware','controllers','services','models','errors','integrations','repositories','utils','jobs'];
export async function checkArchitecture(directory=root){const errors=[];for(const layer of layers){try{await fs.access(path.join(directory,'src',layer));}catch{errors.push(`Missing layer: ${layer}`);}}
  async function scan(folder){for(const entry of await fs.readdir(folder,{withFileTypes:true})){const file=path.join(folder,entry.name);if(entry.isDirectory())await scan(file);else if(file.endsWith('.js')){const source=await fs.readFile(file,'utf8');if(/\.sync\s*\(|sequelize\.query\s*\(/.test(source))errors.push(`Application DDL/raw SQL: ${path.relative(directory,file)}`);if(file.includes(`${path.sep}controllers${path.sep}`)&&/from\s+['"][^'"]*(models|repositories|vision|integrations)\//.test(source))errors.push(`Controller bypasses service: ${path.relative(directory,file)}`);}}}await scan(path.join(directory,'src'));return errors;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const errors=await checkArchitecture();if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log('Architecture checks passed.');}
