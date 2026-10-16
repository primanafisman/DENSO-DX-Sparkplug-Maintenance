import test from 'node:test';
import assert from 'node:assert/strict';
import {containTransform,imageToViewport,viewportToImage,moveRoi,resizeRoi,scaleRoi,proposeLabelRoi,createRoiState} from '../smoke_ui/roi-geometry.js';

const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);

test('portrait photo mapping excludes horizontal letterboxing',()=>{
  const transform=containTransform({imageWidth:1000,imageHeight:2000,viewportWidth:400,viewportHeight:400});
  assert.deepEqual(transform,{left:100,top:0,width:200,height:400,panX:0,panY:0});
  assert.deepEqual(viewportToImage({x:150,y:300},transform),{x:.25,y:.75});
  assert.deepEqual(viewportToImage({x:50,y:200},transform),{x:-.25,y:.5});
});

test('landscape photo maps normalized ROI into vertical letterboxing',()=>{
  const transform=containTransform({imageWidth:2000,imageHeight:1000,viewportWidth:400,viewportHeight:400});
  assert.deepEqual(imageToViewport({x:.1,y:.2,width:.5,height:.4},transform),{left:40,top:140,width:200,height:80});
});

test('zoom and pan map back to the same original normalized image coordinates',()=>{
  const transform=containTransform({imageWidth:1000,imageHeight:2000,viewportWidth:400,viewportHeight:400,zoom:3,panX:50,panY:-100});
  for(const [key,value] of Object.entries({left:-50,top:-500,width:600,height:1200,panX:50,panY:-100}))near(transform[key],value);
  const point=viewportToImage({x:250,y:400},transform);
  near(point.x,.5);near(point.y,.75);
});

test('pan clamps to visible photo bounds and cannot move an unzoomed photo',()=>{
  const fitted=containTransform({imageWidth:1000,imageHeight:2000,viewportWidth:400,viewportHeight:400,panX:80,panY:-80});
  for(const [key,value] of Object.entries({left:100,top:0,width:200,height:400,panX:0,panY:0}))near(fitted[key],value);
  assert.deepEqual(containTransform({imageWidth:1000,imageHeight:1000,viewportWidth:400,viewportHeight:400,zoom:2,panX:999,panY:-999}),{left:0,top:-400,width:800,height:800,panX:200,panY:-200});
});

test('drag movement retains size and clamps every original photo boundary',()=>{
  assert.deepEqual(moveRoi({x:.2,y:.3,width:.4,height:.2},{x:2,y:-2}),{x:.6,y:0,width:.4,height:.2});
  assert.deepEqual(moveRoi({x:.2,y:.3,width:.4,height:.2},{x:0,y:0}),{x:.2,y:.3,width:.4,height:.2});
});

test('corner resize preserves its opposite corner and enforces minimum size',()=>{
  const northWest=resizeRoi({x:.2,y:.3,width:.4,height:.2},'nw',{x:-1,y:-1});
  near(northWest.width,.6);near(northWest.height,.5);assert.equal(northWest.x,0);assert.equal(northWest.y,0);
  const southEast=resizeRoi({x:.2,y:.3,width:.4,height:.2},'se',{x:-1,y:2});
  near(southEast.width,.02);near(southEast.height,.7);assert.equal(southEast.x,.2);assert.equal(southEast.y,.3);
});

test('crop size buttons expand around center without escaping the image',()=>{
  const expanded=scaleRoi({x:.25,y:.25,width:.5,height:.5},1.2);
  near(expanded.x,.2);near(expanded.y,.2);near(expanded.width,.6);near(expanded.height,.6);
  assert.deepEqual(scaleRoi({x:.8,y:.8,width:.2,height:.2},20),{x:0,y:0,width:1,height:1});
});

test('a missing label gets a separate proposal directly below the gauge',()=>{
  const proposal=proposeLabelRoi({x:.2,y:.15,width:.6,height:.5});
  near(proposal.x,.2);near(proposal.y,.665);near(proposal.width,.6);near(proposal.height,.14);
  const bounded=proposeLabelRoi({x:.8,y:.7,width:.2,height:.3});
  near(bounded.y+bounded.height,1);
});

test('gauge adjustment leaves independent label untouched and no-motion edits do not invalidate',()=>{
  const changes=[];
  const state=createRoiState({roi:{x:.2,y:.15,width:.6,height:.5},label_roi:{x:.25,y:.7,width:.5,height:.1}},value=>changes.push(value));
  state.update('gauge',{x:.2,y:.15,width:.6,height:.5});assert.equal(changes.length,0);
  state.update('gauge',{x:.1,y:.1,width:.6,height:.5});assert.equal(changes.length,1);
  assert.deepEqual(state.getRegions().label_roi,{x:.25,y:.7,width:.5,height:.1});
  state.setRegions({roi:{x:0,y:0,width:1,height:1},label_roi:null});assert.equal(changes.length,1);
  assert.equal(state.getRegions().label_roi,null);
  state.setLabelEnabled(true);assert.equal(changes.length,2);
  state.setLabelEnabled(true);assert.equal(changes.length,2);
  assert.ok(changes[1].label_roi.height>0);
});

test('small detected labels keep their original valid bounds when loaded or nudged',()=>{
  const label={x:.45,y:.6,width:.015,height:.012};
  const state=createRoiState({roi:{x:.2,y:.15,width:.6,height:.4},label_roi:label});
  assert.deepEqual(state.getRegions().label_roi,label);
  const moved=moveRoi(label,{x:.01,y:0});near(moved.x,.46);assert.equal(moved.width,.015);assert.equal(moved.height,.012);
  const resized=resizeRoi(label,'ne',{x:0,y:-.01});near(resized.width,.015);near(resized.height,.022);
  const smaller=scaleRoi(label,.9);near(smaller.width,.0135);near(smaller.height,.0108);
});

test('explicit photo drag pans over a full-frame ROI while box mode retains crop editing',async()=>{
  const {pointerDragIntent}=await import('../smoke_ui/roi-editor.js');
  assert.equal(typeof pointerDragIntent,'function');
  assert.equal(pointerDragIntent({mode:'photo',overBox:true,zoom:2}),'pan');
  assert.equal(pointerDragIntent({mode:'photo',overBox:false,zoom:2}),'pan');
  assert.equal(pointerDragIntent({mode:'photo',overBox:true,zoom:1}),null);
  assert.equal(pointerDragIntent({mode:'box',overBox:true,zoom:2}),'roi');
  assert.equal(pointerDragIntent({mode:'box',overBox:true,zoom:1}),'roi');
  assert.equal(pointerDragIntent({mode:'box',overBox:false,zoom:2}),'pan');
  assert.equal(pointerDragIntent({mode:'box',overBox:false,zoom:1}),null);
});
