import test from 'node:test';
import assert from 'node:assert/strict';
import {settingsInput,definitionUpdate} from '../src/validations/maintenanceValidation.js';
import {instrumentInput} from '../src/validations/instrumentValidation.js';
import {profile} from './support.js';

test('production lines are configurable names beyond17, trimmed and unique without case distinctions',()=>{
 const base={allowed_samplers:['Ldr'],night_rollover_hour:12};
 assert.deepEqual(settingsInput.parse({...base,lines:['1','18',' Line A ']}).lines,['1','18','Line A']);
 assert.equal(settingsInput.safeParse({...base,lines:[]}).success,true);
 for(const lines of [[''],['  '],['Line A','line a'],['17',' 17 '],['x'.repeat(65)],Array.from({length:201},(_,i)=>String(i))])assert.equal(settingsInput.safeParse({...base,lines}).success,false);
});

test('new or edited equipment must explicitly choose working or not working',()=>{
 const body={name:'Gauge',profile};
 for(const condition of [undefined,'unknown',''])assert.equal(instrumentInput.safeParse({...body,condition}).success,false);
 for(const condition of ['working','not_working'])assert.equal(instrumentInput.safeParse({...body,condition}).success,true);
});

test('inspection classification explicitly supports machine checks and spark plug product samples',()=>{
 const body={name:'Check',standard_text:'Good condition',method_text:'Visual',tool:'Visual',unit:null,limits:null,intervals:['per_shift'],triggers:['routine'],review_reason:'Configured'};
 assert.equal(definitionUpdate.safeParse(body).success,true);
 for(const inspection_target of ['machine','product'])assert.equal(definitionUpdate.safeParse({...body,inspection_target}).success,true);
 assert.equal(definitionUpdate.safeParse({...body,inspection_target:'unknown'}).success,false);
});
