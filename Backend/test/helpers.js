import bcrypt from 'bcrypt';
export const password = ' test-passphrase-123 ';
export const config = {environment:'test',port:8100,host:'127.0.0.1',jwtSecret:'test-secret-with-at-least-32-characters',jwtIssuer:'SPM',jwtAudience:'SPM',sessionSeconds:3600,secureCookies:false,origins:['http://localhost:8100'],internalToken:'test-internal-token-at-least-32-characters',cvUrl:'http://127.0.0.1:8101',runtimeDir:'runtime',ttlSeconds:900,maxJobs:5};
export async function userRepo(role='Admin') {
  const user={id:'u1',username:'001',role,active:true,password_hash:await bcrypt.hash(password,4)};
  return {users:{findByUsername:async name=>name===user.username?user:null,getById:async id=>id===user.id?user:null}};
}
