import test from 'node:test';
import assert from 'node:assert/strict';
test('monitor capture selects one original still photo by guide quality, without blending or upload',async()=>{
  const {selectCameraPhoto}=await import('../smoke_ui/camera-capture.js');
  const sources=[{blob:'first',score:20},{blob:'second',score:80},{blob:'third',score:40}];let calls=0,frames=0;
  const selected=await selectCameraPhoto({monitor:true,takePhoto:async()=>sources[calls++],takeFrame:async()=>{frames++;},sleep:async()=>{}});
  assert.equal(selected.blob,'second');assert.equal(selected.source,'still');assert.equal(calls,3);assert.equal(frames,0);
});
test('unsupported or failed still API falls back to a bounded sequence of video frames',async()=>{
  const {selectCameraPhoto}=await import('../smoke_ui/camera-capture.js');let photos=0,frames=0;
  const result=await selectCameraPhoto({takePhoto:async()=>{photos++;throw Error('Unsupported');},takeFrame:async()=>({blob:++frames,score:frames===2?90:10}),sleep:async()=>{}});
  assert.equal(result.blob,2);assert.equal(result.source,'video');assert.equal(photos,1);assert.equal(frames,4);
});
test('closing the camera during the burst prevents stale capture delivery',async()=>{
  const {selectCameraPhoto}=await import('../smoke_ui/camera-capture.js');const controller=new AbortController();let calls=0;
  await assert.rejects(selectCameraPhoto({monitor:true,signal:controller.signal,takeFrame:async()=>({blob:++calls,score:10}),sleep:async()=>controller.abort()}),{name:'AbortError'});
  assert.equal(calls,1);
});
test('camera cancellation does not wait for a stalled native photo API',async()=>{
  const {selectCameraPhoto}=await import('../smoke_ui/camera-capture.js');const controller=new AbortController();
  const waiting=selectCameraPhoto({signal:controller.signal,takePhoto:()=>new Promise(()=>{}),takeFrame:async()=>({blob:'frame',score:1})});
  controller.abort();
  await assert.rejects(Promise.race([waiting,new Promise((resolve,reject)=>setTimeout(()=>reject(Error('Cancellation stalled')),50))]),{name:'AbortError'});
});
test('continuous focus and torch-off are capability checked; unsupported controls never fail capture',async()=>{
  const {configureCamera}=await import('../smoke_ui/camera-capture.js');const constraints=[];
  const track={getCapabilities:()=>({focusMode:['continuous','manual'],exposureMode:['continuous'],torch:true}),applyConstraints:async value=>constraints.push(value)};
  const result=await configureCamera(track);assert.equal(result.focusRequested,true);
  assert.ok(constraints.some(value=>value.advanced?.[0].focusMode==='continuous'));
  assert.ok(constraints.some(value=>value.advanced?.[0].torch===false));
  assert.equal((await configureCamera({getCapabilities:()=>({}),applyConstraints:async()=>{throw Error();}})).focusRequested,false);
});
test('focus/exposure changes preserve requested resolution and previously enabled controls',async()=>{
  const {configureCamera}=await import('../smoke_ui/camera-capture.js');const applied=[];
  await configureCamera({getConstraints:()=>({width:{ideal:3840},height:{ideal:2160},facingMode:{ideal:'environment'}}),getCapabilities:()=>({focusMode:['continuous'],exposureMode:['continuous'],torch:true}),applyConstraints:async constraints=>applied.push(constraints)});
  for(const constraints of applied)assert.deepEqual(constraints.width,{ideal:3840});
  assert.equal(applied.at(-1).advanced.at(-1).focusMode,'continuous');
  assert.equal(applied.at(-1).advanced.at(-1).exposureMode,'continuous');
  assert.equal(applied.at(-1).advanced.at(-1).torch,false);
});
test('gauge guide is square in source pixels and label stays immediately below it after letterboxing',async()=>{
  const {cameraGuideRegions,fitVideo}=await import('../smoke_ui/camera-capture.js');
  for(const [width,height] of [[1920,1080],[1080,1920],[640,480]]){
    const {gauge,label}=cameraGuideRegions(width,height);
    assert.ok(Math.abs(gauge.width*width-gauge.height*height)<1e-6);
    assert.ok(label.y>gauge.y+gauge.height&&label.y+label.height<=1);
    assert.equal(label.x,gauge.x);assert.equal(label.width,gauge.width);
    assert.ok((label.y-gauge.y-gauge.height)*height<gauge.height*height*.05);
    const fit=fitVideo(width,height,360,480);assert.ok(fit.x>=0&&fit.y>=0);assert.ok(fit.width<=360&&fit.height<=480);
  }
});
test('still-photo size requests respect camera capability steps and keep transfer pixel budget bounded',async()=>{
  const {chooseStillSettings}=await import('../smoke_ui/camera-capture.js');
  const selected=chooseStillSettings({imageWidth:{min:640,max:6000,step:8},imageHeight:{min:480,max:4000,step:8},fillLightMode:['auto','off']});
  assert.ok(selected.imageWidth*selected.imageHeight<=18000000);
  assert.equal((selected.imageWidth-640)%8,0);assert.equal((selected.imageHeight-480)%8,0);assert.equal(selected.fillLightMode,'off');
  assert.deepEqual(chooseStillSettings({}),{});
});
test('quality ranking uses image structure rather than favoring a fine screen checker pattern',async()=>{
  const {frameQuality}=await import('../smoke_ui/camera-capture.js');
  function fixture(kind){const width=80,height=80,data=new Uint8ClampedArray(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const value=kind==='flat'?120:kind==='checker'?((x+y)%2?245:5):x>20&&x<60&&y>15&&y<65?40:200;const i=(y*width+x)*4;data.set([value,value,value,255],i);}return {width,height,data};}
  assert.ok(frameQuality(fixture('text')).score>frameQuality(fixture('flat')).score);
  assert.ok(frameQuality(fixture('text')).score>frameQuality(fixture('checker')).score);
});
