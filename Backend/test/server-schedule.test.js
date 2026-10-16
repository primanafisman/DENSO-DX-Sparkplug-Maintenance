import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {createMaintenanceService} from '../src/services/maintenanceService.js';
import {createApp} from '../src/app.js';
import {config,password,userRepo} from './helpers.js';

function readOnlyRepositories(value){
  const forbidden=()=>{throw new Error('Schedule must not write to repositories.');};
  return {
    settings:{get:async key=>{assert.equal(key,'maintenance-settings');return value?{value}:null;},update:forbidden},
    transaction:forbidden,
    maintenance:{createRecord:forbidden},
    audit:{append:forbidden},
  };
}

const cases=[
  ['before 01:15','2026-10-15T01:14:59.999+07:00','night-2115','night','2026-10-14','2026-10-14T14:15:00.000Z','2026-10-14T18:15:00.000Z'],
  ['at 01:15','2026-10-15T01:15:00.000+07:00','night-0115','night','2026-10-14','2026-10-14T18:15:00.000Z','2026-10-15T00:45:00.000Z'],
  ['before 07:45','2026-10-15T07:44:59.999+07:00','night-0115','night','2026-10-14','2026-10-14T18:15:00.000Z','2026-10-15T00:45:00.000Z'],
  ['at 07:45','2026-10-15T07:45:00.000+07:00','day-0745','day','2026-10-15','2026-10-15T00:45:00.000Z','2026-10-15T05:45:00.000Z'],
  ['before 12:45','2026-10-15T12:44:59.999+07:00','day-0745','day','2026-10-15','2026-10-15T00:45:00.000Z','2026-10-15T05:45:00.000Z'],
  ['at 12:45','2026-10-15T12:45:00.000+07:00','day-1245','day','2026-10-15','2026-10-15T05:45:00.000Z','2026-10-15T14:15:00.000Z'],
  ['before 21:15','2026-10-15T21:14:59.999+07:00','day-1245','day','2026-10-15','2026-10-15T05:45:00.000Z','2026-10-15T14:15:00.000Z'],
  ['at 21:15','2026-10-15T21:15:00.000+07:00','night-2115','night','2026-10-15','2026-10-15T14:15:00.000Z','2026-10-15T18:15:00.000Z'],
  ['at midnight','2026-10-15T00:00:00.000+07:00','night-2115','night','2026-10-14','2026-10-14T14:15:00.000Z','2026-10-14T18:15:00.000Z'],
  ['at month rollover','2026-11-01T00:00:00.000+07:00','night-2115','night','2026-10-31','2026-10-31T14:15:00.000Z','2026-10-31T18:15:00.000Z'],
  ['at year rollover','2027-01-01T00:00:00.000+07:00','night-2115','night','2026-12-31','2026-12-31T14:15:00.000Z','2026-12-31T18:15:00.000Z'],
  ['after 01:15 in the new year','2027-01-01T02:00:00.000+07:00','night-0115','night','2026-12-31','2026-12-31T18:15:00.000Z','2027-01-01T00:45:00.000Z'],
];

for(const [description,timestamp,slotId,shift,productionDate,startsAt,nextStartsAt] of cases){
  test(`server schedule selects the latest WIB start ${description}`,async()=>{
    const service=createMaintenanceService({repositories:readOnlyRepositories(),clock:()=>new Date(timestamp).valueOf()});
    assert.equal(typeof service.schedule,'function','Maintenance service must expose its server schedule.');
    const result=await service.schedule();
    assert.equal(result.server_time,new Date(timestamp).toISOString());
    assert.equal(result.timezone,'Asia/Jakarta');
    assert.equal(result.calendar_date,timestamp.slice(0,10));
    assert.equal(result.production_date,productionDate);
    assert.equal(result.slot_id,slotId);
    assert.equal(result.shift,shift);
    assert.equal(result.shift_label,shift==='day'?'Shift 1':'Shift 2');
    assert.equal(result.starts_at,startsAt);
    assert.equal(result.next_starts_at,nextStartsAt);
    assert.ok(Date.parse(result.starts_at)<=Date.parse(result.server_time));
    assert.ok(Date.parse(result.next_starts_at)>Date.parse(result.server_time));
  });
}

test('server schedule returns all four daily check starts for display',async()=>{
  const service=createMaintenanceService({repositories:readOnlyRepositories(),clock:()=>Date.parse('2026-10-15T00:45:00Z')});
  assert.equal(typeof service.schedule,'function');
  const result=await service.schedule();
  assert.deepEqual(result.schedule.map(({slot_id,shift,start_time})=>({slot_id,shift,start_time})),[
    {slot_id:'night-0115',shift:'night',start_time:'01:15'},
    {slot_id:'day-0745',shift:'day',start_time:'07:45'},
    {slot_id:'day-1245',shift:'day',start_time:'12:45'},
    {slot_id:'night-2115',shift:'night',start_time:'21:15'},
  ]);
  assert.equal(result.slot_label,result.schedule.find(slot=>slot.slot_id===result.slot_id).slot_label);
  for(const slot of result.schedule)assert.match(slot.slot_label,new RegExp(slot.start_time));
});

test('server schedule respects configured night production rollover and defaults missing values to noon',async()=>{
  for(const [settings,expectedDate] of [[{night_rollover_hour:2},'2026-10-15'],[{night_rollover_hour:0},'2026-10-15'],[{},'2026-10-14']]){
    const service=createMaintenanceService({repositories:readOnlyRepositories(settings),clock:()=>Date.parse('2026-10-15T03:00:00+07:00')});
    assert.equal(typeof service.schedule,'function');
    const result=await service.schedule();
    assert.equal(result.slot_id,'night-0115');
    assert.equal(result.production_date,expectedDate);
  }
});

test('schedule API requires authentication and follows the injected server clock despite client dates',async()=>{
  let now=Date.parse('2026-10-15T07:44:59.999+07:00');
  const repositories={...await userRepo('Viewer'),...readOnlyRepositories()};
  const app=createApp({config,repositories,clock:()=>now});
  await request(app).get('/api/v1/maintenance/schedule').expect(401);
  const login=await request(app).post('/api/v1/auth/token').send({username:'001',password}).expect(200);
  const authorization=`Bearer ${login.body.data.access_token}`;
  const before=await request(app).get('/api/v1/maintenance/schedule')
    .query({timestamp:'2099-01-01T00:00:00Z',server_time:'2099-01-01T00:00:00Z',shift:'day',production_date:'2099-01-01'})
    .set('Authorization',authorization).set('Date','Thu, 01 Jan 2099 00:00:00 GMT').expect(200);
  assert.equal(before.body.success,true);
  assert.equal(typeof before.body.request_id,'string');
  assert.equal(before.body.data.server_time,'2026-10-15T00:44:59.999Z');
  assert.equal(before.body.data.slot_id,'night-0115');
  assert.equal(before.body.data.production_date,'2026-10-14');
  assert.match(before.headers['cache-control'],/no-store/);
  now=Date.parse('2026-10-15T07:45:00.000+07:00');
  const after=await request(app).get('/api/v1/maintenance/schedule').set('Authorization',authorization).expect(200);
  assert.equal(after.body.data.server_time,'2026-10-15T00:45:00.000Z');
  assert.equal(after.body.data.slot_id,'day-0745');
  assert.equal(after.body.data.production_date,'2026-10-15');
});
