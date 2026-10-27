import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSummary} from '../src/services/reporting/summary.js';

const entry=(definition_id,name,checked_at,date='2026-10-20',overall_status='OK')=>({occurrence:{
  id:definition_id+'-'+checked_at,
  checked_at,
  context:{production_date:date,line:'17',shift:'night',sampler:'Ldr'},
  overall_status,
  definition_snapshot:{id:definition_id,name},
}});

test('summary groups use the latest actual inspection instant within the production-date cutoff',()=>{
  const summary=buildSummary([
    entry('beta','Beta','2026-10-20T17:00:00Z','2026-10-19','NG'),
    entry('alpha','Alpha','2026-10-20T23:45:00+07:00'),
    entry('beta','Beta','2026-10-20T23:40:00+07:00'),
    entry('alpha','Alpha','2026-10-22T08:00:00+07:00','2026-10-22'),
    entry('beta','Beta','invalid'),
  ],{},'2026-10-21');

  assert.deepEqual(summary.groups,[
    {definition_id:'alpha',check_number:null,name:'Alpha',total:1,ok:1,ng:0,latest_checked_at:'2026-10-20T23:45:00+07:00'},
    {definition_id:'beta',check_number:null,name:'Beta',total:3,ok:2,ng:1,latest_checked_at:'2026-10-20T17:00:00Z'},
  ]);
  assert.equal(summary.total,4);
  assert.deepEqual(summary.daily,[{date:'2026-10-19',ok:0,ng:1},{date:'2026-10-20',ok:3,ng:0}]);
});

test('summary groups without numbers use stable names and ids regardless of inspection times',()=>{
  const summary=buildSummary([
    entry('unknown-z','Zulu',null),
    entry('same-z','Same','2026-10-20T10:00:00Z'),
    entry('unknown-b','Beta','not-a-date'),
    entry('same-a','Same','2026-10-20T17:00:00+07:00'),
    entry('unknown-a','Alpha',undefined),
    entry('alpha','Alpha','2026-10-20T10:00:00Z'),
    entry('unknown-number','Numeric',0),
  ],{},'2026-10-21');

  assert.deepEqual(summary.groups.map(group=>group.definition_id),['alpha','unknown-a','unknown-b','unknown-number','same-a','same-z','unknown-z']);
  assert.deepEqual(summary.groups.filter(group=>group.definition_id.startsWith('unknown')).map(group=>group.latest_checked_at),[null,null,null,null]);
  assert.equal(summary.total,7);
});

test('summary sorts by current catalog number and retains snapshot fallback and latest inspection time',()=>{
  const entries=[entry('first','Zulu','2026-10-20T12:00:00Z'),entry('second','Alpha','2026-10-20T13:00:00Z'),entry('old','Old','2026-10-20T14:00:00Z'),entry('unknown','Unknown','2026-10-20T15:00:00Z')];
  entries[0].occurrence.definition_snapshot.check_number=1;
  entries[1].occurrence.definition_snapshot.check_number=2;
  entries[2].occurrence.definition_snapshot.check_number=8;
  const summary=buildSummary(entries,{},'2026-10-21',new Map([['first',50],['second',3]]));
  assert.deepEqual(summary.groups.map(group=>[group.definition_id,group.check_number]),[['second',3],['old',8],['first',50],['unknown',null]]);
  assert.equal(summary.groups[2].latest_checked_at,'2026-10-20T12:00:00Z');
  assert.equal(entries[0].occurrence.definition_snapshot.check_number,1);
});
