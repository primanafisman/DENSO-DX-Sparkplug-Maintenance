import test from 'node:test';
import assert from 'node:assert/strict';
import {eeGroups} from './fixtures/spc-paper.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('paper EE fixture matches independently calculated Xbar R sigma Cp and Cpk',async()=>{
  const {calculateSpc}=await import('../src/services/spcService.js');
  const s=calculateSpc({groups:eeGroups,lsl:4.4,usl:4.6,method:'paper_stdev_s'});
  assert.equal(s.k,7);assert.equal(s.n,4);assert.equal(s.N,28);
  near(s.sum_raw,125.96);near(s.sum_xbar,31.49);near(s.sum_r,.16);
  near(s.grand_mean,4.498571428571428);near(s.rbar,.022857142857143);
  near(s.s_overall,.012971274735120);near(s.sigma_within,.011101089294387);
  near(s.control_limits.ucl_x,4.515234285714286);near(s.control_limits.lcl_x,4.481908571428571);
  near(s.control_limits.ucl_r,.05216);near(s.control_limits.lcl_r,0);
  near(s.capability.cp,2.569780843750274);near(s.capability.cpk,2.533069688839537);near(s.r_max,.03);
  assert.equal(s.capability.provisional,true);assert.equal(s.capability.method,'paper_stdev_s');
});
test('n8 uses its own constants and within method is explicit',async()=>{
  const {calculateSpc}=await import('../src/services/spcService.js');
  const s=calculateSpc({groups:[[1,2,3,4,5,6,7,8],[2,3,4,5,6,7,8,9]],lsl:0,usl:10,method:'within_rbar_d2'});
  near(s.grand_mean,5);near(s.rbar,7);near(s.control_limits.ucl_x,7.611);near(s.control_limits.lcl_x,2.389);
  near(s.control_limits.ucl_r,13.048);near(s.control_limits.lcl_r,.952);near(s.capability.sigma,7/2.847);
  near(s.three_sigma,3*7/2.847);
});
test('empty, n1, constant and unsupported subgroups have explicit finite undefined reasons',async()=>{
  const {calculateSpc}=await import('../src/services/spcService.js');
  for(const [groups,reason] of [[[],'NO_DATA'],[[[1],[2]],'SUBGROUP_SIZE_ONE'],[[[1,1,1,1],[1,1,1,1]],'ZERO_VARIANCE'],[[[1,2,3]],'UNSUPPORTED_SUBGROUP_SIZE']]){
    const s=calculateSpc({groups,lsl:0,usl:2,method:'paper_stdev_s'});
    assert.equal(s.capability.cp,null);assert.equal(s.capability.reason,reason);assert.doesNotMatch(JSON.stringify(s),/NaN|Infinity/);
    if(groups[0]?.length===1)assert.equal(s.control_limits.ucl_r,null);
  }
});
test('missing specifications negative Cpk and outliers remain honest',async()=>{
  const {calculateSpc}=await import('../src/services/spcService.js');
  const one=calculateSpc({groups:eeGroups,lsl:null,usl:4.6,method:'paper_stdev_s'});
  assert.equal(one.capability.cp,null);assert.equal(one.capability.reason,'ONE_SIDED_SPECIFICATION');assert.ok(one.capability.cpk>0);
  const missing=calculateSpc({groups:eeGroups,lsl:null,usl:null,method:'paper_stdev_s'});assert.equal(missing.capability.reason,'MISSING_SPECIFICATION');
  const negative=calculateSpc({groups:[[1,2,3,4],[2,3,4,5]],lsl:0,usl:1,method:'paper_stdev_s'});assert.ok(negative.capability.cpk<0);
  const outlier=calculateSpc({groups:[...eeGroups,[9,9,9,9]],lsl:4.4,usl:4.6,method:'paper_stdev_s'});assert.equal(outlier.k,8);assert.equal(outlier.N,32);assert.ok(outlier.grand_mean>5);
});
test('invalid unequal and non-finite input is rejected rather than coerced',async()=>{
  const {calculateSpc}=await import('../src/services/spcService.js');
  for(const groups of [[[1,2],[3]],[[1,2,NaN,4]],[[1,2,'3',4]]])assert.throws(()=>calculateSpc({groups,lsl:0,usl:1,method:'paper_stdev_s'}),/invalid|finite|equal/i);
});
