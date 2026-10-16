import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
for(const shell of ['powershell.exe','pwsh.exe']){
  test(`Windows launcher verifies readiness and exact process ownership in ${shell}`, {skip:process.platform!=='win32'},t=>{
    const result=spawnSync(shell,['-NoProfile','-ExecutionPolicy','Bypass','-File','test/launcher-cases.ps1'],{encoding:'utf8',timeout:15000});
    if(shell==='pwsh.exe'&&result.error?.code==='ENOENT'){t.skip('PowerShell 7 is not installed.');return;}
    assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
  });
}
