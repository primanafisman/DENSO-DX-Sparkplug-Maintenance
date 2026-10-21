import test from 'node:test';import assert from 'node:assert/strict';
import {instrumentInput} from '../src/validations/instrumentValidation.js';
import {profile} from './support.js';
test('equipment remains editable with custom inspection links beyond the original44',()=>{
 assert.equal(instrumentInput.safeParse({name:'Gauge',profile,maintenance_check_ids:Array.from({length:45},(_,i)=>'check-'+i)}).success,true);
 assert.equal(instrumentInput.safeParse({name:'Gauge',profile,maintenance_check_ids:Array.from({length:501},(_,i)=>'check-'+i)}).success,false);
});
