import bcrypt from 'bcrypt';
import {createRepositories} from '../src/repositories/index.js';
import {assertNodeVersion,loadConfig} from '../src/config/runtime.js';
let repositories;
try{assertNodeVersion();process.loadEnvFile();const password=process.env.ADMIN_PASSWORD,username=process.env.ADMIN_USERNAME;if(!username||!password||password.length<12||Buffer.byteLength(password)>72)throw new Error();repositories=await createRepositories(loadConfig());if(await repositories.users.findByUsername(username))throw new Error();await repositories.users.create({username,role:'Admin',active:true,password_hash:await bcrypt.hash(password,12)});console.log('Admin created. No password printed.');}catch{console.error('Admin seed failed: supply a new ADMIN_USERNAME and ADMIN_PASSWORD (12–72 UTF-8 bytes), and initialize schema first.');process.exitCode=1;}finally{await repositories?.close();}
