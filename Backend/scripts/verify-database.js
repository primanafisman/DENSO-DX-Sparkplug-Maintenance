import {createRepositories} from '../src/repositories/index.js';
import {assertNodeVersion,loadConfig} from '../src/config/runtime.js';
try{assertNodeVersion();process.loadEnvFile();const repository=await createRepositories(loadConfig());await repository.close();console.log('Configured database connection and schema verified.');}catch{console.error('Database verification failed. Check configuration and reviewed schema.');process.exitCode=1;}
