import test from 'node:test';
import assert from 'node:assert/strict';
import {productionDate,scheduleAt} from '../src/services/productionContextService.js';
import {maintenanceOccurrence} from '../src/services/maintenanceDueService.js';
import {settingsInput} from '../src/validations/maintenanceValidation.js';

const settings={
  lines:['17'],
  allowed_samplers:['Ldr'],
  night_rollover_hour:1,
  shift_schedule:{day:['08:10','13:20'],night:['22:05','02:25']},
};
const definition={id:'custom',definition_version:3,intervals:['per_shift'],shifts:['day','night']};
const wrappedSettings={...settings,shift_schedule:{day:['20:10','01:20'],night:['08:00','13:10']}};

test('custom schedule keeps logical slot IDs while updating sorted display times and labels',()=>{
  const result=scheduleAt('2026-10-21T13:20:00+07:00',settings);
  assert.deepEqual(result.schedule.map(({slot_id,shift,start_time,slot_label})=>({slot_id,shift,start_time,slot_label})),[
    {slot_id:'night-0115',shift:'night',start_time:'02:25',slot_label:'Shift 2 · 02:25 WIB'},
    {slot_id:'day-0745',shift:'day',start_time:'08:10',slot_label:'Shift 1 · 08:10 WIB'},
    {slot_id:'day-1245',shift:'day',start_time:'13:20',slot_label:'Shift 1 · 13:20 WIB'},
    {slot_id:'night-2115',shift:'night',start_time:'22:05',slot_label:'Shift 2 · 22:05 WIB'},
  ]);
  assert.equal(result.slot_id,'day-1245');
  assert.equal(result.slot_label,'Shift 1 · 13:20 WIB');
});

const scheduleCases=[
  ['before second night start','2026-10-22T02:24:59.999+07:00','night-2115','night','2026-10-21','2026-10-21T15:05:00.000Z','2026-10-21T19:25:00.000Z'],
  ['at second night start','2026-10-22T02:25:00+07:00','night-0115','night','2026-10-21','2026-10-21T19:25:00.000Z','2026-10-22T01:10:00.000Z'],
  ['before first day start','2026-10-22T08:09:59.999+07:00','night-0115','night','2026-10-21','2026-10-21T19:25:00.000Z','2026-10-22T01:10:00.000Z'],
  ['at first day start','2026-10-22T08:10:00+07:00','day-0745','day','2026-10-22','2026-10-22T01:10:00.000Z','2026-10-22T06:20:00.000Z'],
  ['before second day start','2026-10-22T13:19:59.999+07:00','day-0745','day','2026-10-22','2026-10-22T01:10:00.000Z','2026-10-22T06:20:00.000Z'],
  ['at second day start','2026-10-22T13:20:00+07:00','day-1245','day','2026-10-22','2026-10-22T06:20:00.000Z','2026-10-22T15:05:00.000Z'],
  ['before first night start','2026-10-22T22:04:59.999+07:00','day-1245','day','2026-10-22','2026-10-22T06:20:00.000Z','2026-10-22T15:05:00.000Z'],
  ['at first night start','2026-10-22T22:05:00+07:00','night-2115','night','2026-10-22','2026-10-22T15:05:00.000Z','2026-10-22T19:25:00.000Z'],
  ['at midnight','2026-10-22T00:00:00+07:00','night-2115','night','2026-10-21','2026-10-21T15:05:00.000Z','2026-10-21T19:25:00.000Z'],
  ['at month rollover','2026-11-01T00:00:00+07:00','night-2115','night','2026-10-31','2026-10-31T15:05:00.000Z','2026-10-31T19:25:00.000Z'],
  ['at year rollover','2027-01-01T00:00:00+07:00','night-2115','night','2026-12-31','2026-12-31T15:05:00.000Z','2026-12-31T19:25:00.000Z'],
];
for(const [description,timestamp,slotId,shift,date,startsAt,nextStartsAt] of scheduleCases){
  test(`custom schedule selects the latest configured start ${description}`,()=>{
    const result=scheduleAt(timestamp,settings);
    assert.equal(result.slot_id,slotId);
    assert.equal(result.shift,shift);
    assert.equal(result.production_date,date);
    assert.equal(result.calendar_date,timestamp.slice(0,10));
    assert.equal(result.starts_at,startsAt);
    assert.equal(result.next_starts_at,nextStartsAt);
  });
}

for(const shift of ['day','night']){
  test(`custom production date uses first day start to the minute for ${shift} context`,()=>{
    assert.equal(productionDate('2027-01-01T08:09:59.999+07:00',shift,settings),'2026-12-31');
    assert.equal(productionDate('2027-01-01T08:10:00+07:00',shift,settings),'2027-01-01');
  });
}

test('production date preserves numeric legacy rollover and accepts legacy settings objects',()=>{
  assert.equal(productionDate('2026-10-22T03:00:00+07:00','night'),'2026-10-21');
  assert.equal(productionDate('2026-10-22T03:00:00+07:00','night',2),'2026-10-22');
  assert.equal(productionDate('2026-10-22T03:00:00+07:00','night',0),'2026-10-22');
  assert.equal(productionDate('2026-10-22T03:00:00+07:00','night',{night_rollover_hour:12}),'2026-10-21');
  assert.equal(productionDate('2026-10-22T03:00:00+07:00','day',{night_rollover_hour:12}),'2026-10-22');
});

const occurrenceCases=[
  ['per_shift spans both configured day slots','per_shift','2026-10-21T13:20:00+07:00','2026-10-21T01:10:00.000Z','2026-10-21T15:05:00.000Z','per_shift'],
  ['per_shift spans midnight in the configured night shift','per_shift','2027-01-01T02:25:00+07:00','2026-12-31T15:05:00.000Z','2027-01-01T01:10:00.000Z','per_shift'],
  ['daily remains in the prior date before the minute boundary','daily','2027-01-01T08:09:59.999+07:00','2026-12-31T01:10:00.000Z','2027-01-01T01:10:00.000Z','daily'],
  ['daily opens exactly at the configured first day start','daily','2027-01-01T08:10:00+07:00','2027-01-01T01:10:00.000Z','2027-01-02T01:10:00.000Z','daily'],
  ['weekly retains last Monday before the new Monday boundary','weekly','2027-01-04T08:09:59.999+07:00','2026-12-28T01:10:00.000Z','2027-01-04T01:10:00.000Z','weekly'],
  ['weekly opens at the configured Monday start across years','weekly','2027-01-04T08:10:00+07:00','2027-01-04T01:10:00.000Z','2027-01-11T01:10:00.000Z','weekly'],
  ['every_4_hours follows configured server sessions','every_4_hours','2026-10-21T13:20:00+07:00','2026-10-21T06:20:00.000Z','2026-10-21T15:05:00.000Z','server_sessions'],
];
for(const [description,interval,timestamp,startsAt,nextStartsAt,basis] of occurrenceCases){
  test(description,()=>{
    assert.deepEqual(maintenanceOccurrence({...definition,intervals:[interval]},timestamp,settings),{
      key:`custom:v3:${basis}:${startsAt}`,starts_at:startsAt,next_starts_at:nextStartsAt,basis,
    });
  });
}

test('explicit occurrence rules resolve stable IDs to changed times through midnight',()=>{
  const def={...definition,occurrence_rule:{slot_ids:['day-1245','night-0115']}};
  assert.deepEqual(maintenanceOccurrence(def,'2026-10-21T02:25:00+07:00',settings),{
    key:'custom:v3:slot:2026-10-20T19:25:00.000Z',starts_at:'2026-10-20T19:25:00.000Z',
    next_starts_at:'2026-10-21T06:20:00.000Z',basis:'configured_slots',
  });
  assert.deepEqual(maintenanceOccurrence(def,'2026-10-21T13:20:00+07:00',settings),{
    key:'custom:v3:slot:2026-10-21T06:20:00.000Z',starts_at:'2026-10-21T06:20:00.000Z',
    next_starts_at:'2026-10-21T19:25:00.000Z',basis:'configured_slots',
  });
});

test('weekly explicit slots use configured production weekdays at the new year boundary',()=>{
  const def={...definition,intervals:['weekly'],occurrence_rule:{slot_ids:['day-0745'],weekdays:[1]}};
  assert.deepEqual(maintenanceOccurrence(def,'2027-01-04T08:09:59.999+07:00',settings),{
    key:'custom:v3:slot:2026-12-28T01:10:00.000Z',starts_at:'2026-12-28T01:10:00.000Z',
    next_starts_at:'2027-01-04T01:10:00.000Z',basis:'configured_slots',
  });
});

test('a day shift may wrap midnight while keeping its first and second slot identities',()=>{
  const result=scheduleAt('2027-01-01T01:20:00+07:00',wrappedSettings);
  assert.equal(result.slot_id,'day-1245');
  assert.equal(result.production_date,'2026-12-31');
  assert.equal(result.starts_at,'2026-12-31T18:20:00.000Z');
  assert.equal(result.next_starts_at,'2027-01-01T01:00:00.000Z');
  assert.deepEqual(maintenanceOccurrence(definition,'2027-01-01T01:20:00+07:00',wrappedSettings),{
    key:'custom:v3:per_shift:2026-12-31T13:10:00.000Z',starts_at:'2026-12-31T13:10:00.000Z',
    next_starts_at:'2027-01-01T01:00:00.000Z',basis:'per_shift',
  });
});

test('a wrapped schedule opens daily occurrences at the configured evening production start',()=>{
  assert.deepEqual(maintenanceOccurrence({...definition,intervals:['daily']},'2027-01-01T13:10:00+07:00',wrappedSettings),{
    key:'custom:v3:daily:2026-12-31T13:10:00.000Z',starts_at:'2026-12-31T13:10:00.000Z',
    next_starts_at:'2027-01-01T13:10:00.000Z',basis:'daily',
  });
});

test('settings accept an optional custom schedule and preserve legacy settings without it',()=>{
  assert.equal(settingsInput.safeParse(settings).success,true);
  const {shift_schedule,...legacy}=settings;
  assert.equal(settingsInput.safeParse(legacy).success,true);
});

test('settings accept cyclic shift ordering when the day shift crosses midnight',()=>{
  assert.equal(settingsInput.safeParse(wrappedSettings).success,true);
});

const invalidSchedules=[
  ['single digit hour',{day:['8:10','13:20'],night:['22:05','02:25']}],
  ['invalid hour',{day:['24:10','13:20'],night:['22:05','02:25']}],
  ['invalid minute',{day:['08:60','13:20'],night:['22:05','02:25']}],
  ['seconds',{day:['08:10:00','13:20'],night:['22:05','02:25']}],
  ['leading whitespace',{day:[' 08:10','13:20'],night:['22:05','02:25']}],
  ['duplicate times across shifts',{day:['08:10','13:20'],night:['22:05','08:10']}],
  ['duplicate times within a shift',{day:['08:10','08:10'],night:['22:05','02:25']}],
  ['second day slot after first night slot',{day:['08:10','23:00'],night:['22:05','02:25']}],
  ['reversed night slots',{day:['08:10','13:20'],night:['02:25','22:05']}],
  ['missing day slot',{day:['08:10'],night:['22:05','02:25']}],
  ['extra night slot',{day:['08:10','13:20'],night:['22:05','02:25','04:00']}],
  ['missing shift',{day:['08:10','13:20']}],
  ['extra shift property',{day:['08:10','13:20'],night:['22:05','02:25'],other:['04:00','05:00']}],
];
for(const [description,shift_schedule] of invalidSchedules){
  test(`settings reject custom schedules with ${description}`,()=>{
    assert.equal(settingsInput.safeParse({...settings,shift_schedule}).success,false);
  });
}
