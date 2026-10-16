import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
for(const shell of ['powershell.exe','pwsh.exe']){
  for(const scenario of ['ancestor','cached-node','persistence','stale-cache','python-launcher','venv-repair','native-exit','forward-path','real-python']){
    test(`portable runtime ${scenario} in ${shell}`,{skip:process.platform!=='win32'},t=>{
      const result=spawnSync(shell,['-NoProfile','-ExecutionPolicy','Bypass','-File','test/runtime-tools-cases.ps1','-Case',scenario],{encoding:'utf8',timeout:15000});
      if(shell==='pwsh.exe'&&result.error?.code==='ENOENT'){t.skip('PowerShell 7 is not installed.');return;}
      assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
      if(result.stdout.includes('SKIP real Python:'))t.skip('Local Python environment is absent.');
    });
  }
}
