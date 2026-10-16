import test from 'node:test';
import assert from 'node:assert/strict';
test('runtime rejects versions outside the approved major and weak secrets', async()=>{
  const {loadConfig,assertNodeVersion}=await import('../src/config/runtime.js');
  assert.throws(()=>assertNodeVersion('24.19.0'));
  assert.throws(()=>assertNodeVersion('22.11.0'));
  assert.doesNotThrow(()=>assertNodeVersion('22.23.3'));
  assert.throws(()=>loadConfig({JWT_SECRET:'short'}));
});
