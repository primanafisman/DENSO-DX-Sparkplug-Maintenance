import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inspectionTarget} from '../src/constants/inspectionTargets.js';
test('inspection target follows inspected object rather than numeric input method',()=>{
  assert.equal(inspectionTarget({id:'chart_ee_length',kind:'numeric'}),'product');
  assert.equal(inspectionTarget({id:'chart_talc_load',kind:'numeric'}),'machine');
  assert.equal(inspectionTarget({id:'packing_depth_tool',kind:'visual'}),'machine');
  assert.equal(inspectionTarget({id:'custom-pressure',kind:'numeric'}),null);
  assert.equal(inspectionTarget({id:'custom-pressure',inspection_target:'machine'}),'machine');
  assert.equal(inspectionTarget({id:'chart_ee_length',inspection_target:'machine'}),'machine');
});
