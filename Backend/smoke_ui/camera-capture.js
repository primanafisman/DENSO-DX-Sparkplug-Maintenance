const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function check(signal){if(signal?.aborted)throw new DOMException('Pengambilan foto dibatalkan.','AbortError');}
function deviceOperation(operation,signal,timeout=6000){
  check(signal);
  return new Promise((resolve,reject)=>{
    const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);};
    const abort=()=>{cleanup();reject(new DOMException('Pengambilan foto dibatalkan.','AbortError'));};
    const timer=setTimeout(()=>{cleanup();reject(new Error('Kamera tidak merespons.'));},timeout);
    signal?.addEventListener('abort',abort,{once:true});
    Promise.resolve().then(()=>{check(signal);return operation();}).then(value=>{cleanup();resolve(value);},error=>{cleanup();reject(error);});
  });
}

export function cameraGuideRegions(width,height){
  const side=Math.min(width*.78,height*.68),gap=side*.025,labelHeight=side*.22;
  const x=(width-side)/2/width,y=(height-side-gap-labelHeight)/2/height;
  return {gauge:{x,y,width:side/width,height:side/height},label:{x,y:y+(side+gap)/height,width:side/width,height:labelHeight/height}};
}
export function fitVideo(width,height,boxWidth,boxHeight){const scale=Math.min(boxWidth/width,boxHeight/height);return {x:(boxWidth-width*scale)/2,y:(boxHeight-height*scale)/2,width:width*scale,height:height*scale};}

// Compare guide-region structure after a small low-pass operation so sharp screen
// pixels/background lettering alone do not dominate. This is not reading confidence.
export function frameQuality({data,width,height}){
  const stride=width+1,integral=new Float64Array((width+1)*(height+1)),smooth=new Float32Array(width*height);
  for(let y=0;y<height;y++){let row=0;for(let x=0;x<width;x++){const p=(y*width+x)*4;row+=.299*data[p]+.587*data[p+1]+.114*data[p+2];integral[(y+1)*stride+x+1]=integral[y*stride+x+1]+row;}}
  let sum=0,squares=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const left=Math.max(0,x-2),right=Math.min(width,x+3),top=Math.max(0,y-2),bottom=Math.min(height,y+3);
    const value=(integral[bottom*stride+right]-integral[top*stride+right]-integral[bottom*stride+left]+integral[top*stride+left])/((right-left)*(bottom-top));
    smooth[y*width+x]=value;sum+=value;squares+=value*value;
  }
  const brightness=sum/(width*height),contrast=Math.sqrt(Math.max(0,squares/(width*height)-brightness*brightness));
  let edges=0,count=0;
  for(let y=3;y<height-3;y++)for(let x=3;x<width-3;x++){const i=y*width+x;edges+=Math.abs(smooth[i+1]-smooth[i])+Math.abs(smooth[i+width]-smooth[i]);count++;}
  const sharpness=count?edges/count:0;
  const exposurePenalty=(brightness<20||brightness>240)&&contrast<12?.5:0;
  const score=100*(.6*Math.min(contrast/60,1)+.4*Math.min(sharpness/12,1)-exposurePenalty);
  return {score,contrast,sharpness,brightness};
}
export async function configureCamera(track){
  let caps={};try{caps=track?.getCapabilities?.()||{};}catch{}
  let focusRequested=false,base={};try{base=track.getConstraints?.()||{};}catch{}
  let accepted={};
  async function apply(control,value){const proposed={...accepted,[control]:value};await track.applyConstraints({...base,advanced:[...(base.advanced||[]),proposed]});accepted=proposed;}
  for(const control of ['focusMode','exposureMode','whiteBalanceMode'])if(caps[control]?.includes('continuous')){
    try{await apply(control,'continuous');if(control==='focusMode')focusRequested=true;}catch{}
  }
  if(caps.torch===true)try{await apply('torch',false);}catch{}
  return {focusRequested};
}
export async function selectCameraPhoto({takePhoto,takeFrame,monitor=false,sleep=delay,signal,onStatus=()=>{}}){
  let best;
  async function attempt(take,count,source,spacing){
    for(let index=0;index<count;index++){
      check(signal);onStatus(source==='still'?'Mengambil foto resolusi kamera…':'Memilih frame kamera paling jelas…');
      try{const candidate=await deviceOperation(take,signal);check(signal);if(candidate?.blob&&Number.isFinite(candidate.score)&&(!best||candidate.score>best.score))best={...candidate,source};}
      catch(error){check(signal);if(source==='video'&&index===count-1&&!best)throw error;}
      if(index<count-1){await sleep(spacing);check(signal);}
    }
  }
  if(takePhoto)await attempt(takePhoto,monitor?3:1,'still',220);
  if(!best)await attempt(takeFrame,monitor?5:4,'video',120);
  check(signal);if(!best)throw new Error('Foto belum berhasil diambil. Gunakan kamera bawaan atau upload.');
  return best;
}
function sample(canvasContext,source,width,height){
  const r=cameraGuideRegions(width,height).gauge;
  canvasContext.drawImage(source,r.x*width,r.y*height,r.width*width,r.height*height,0,0,160,160);
  return frameQuality(canvasContext.getImageData(0,0,160,160));
}
function toBlob(canvas){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Gagal membuat foto.')),'image/jpeg',.96));}
export function chooseStillSettings(caps){
  const settings={};if(caps.fillLightMode?.includes('off'))settings.fillLightMode='off';
  const width=caps.imageWidth,height=caps.imageHeight;
  if(Number.isFinite(width?.max)&&Number.isFinite(height?.max)&&width.max>0&&height.max>0){
    const scale=Math.min(1,Math.sqrt(18000000/(width.max*height.max)));
    const align=(range,target)=>{const min=range.min||1,step=range.step||1;return Math.min(range.max,Math.max(min,min+Math.floor((target-min)/step)*step));};
    const imageWidth=align(width,width.max*scale),imageHeight=align(height,height.max*scale);
    if(imageWidth*imageHeight<=18000000){settings.imageWidth=imageWidth;settings.imageHeight=imageHeight;}
  }
  return settings;
}
export function qualityMessage(quality,gaugePixels){
  if(gaugePixels<240)return 'Gauge masih kecil. Perbesar gambar di monitor atau sesuaikan jarak; seluruh skala dan label tetap masuk.';
  if(quality.contrast<10)return 'Detail kurang jelas. Periksa fokus, silau dan pola layar; ubah jarak sedikit.';
  if(quality.sharpness<1.1)return 'Tahan HP stabil dan tunggu fokus pada angka atau jarum.';
  return 'Panduan posisi saja: pastikan titik desimal, ujung jarum dan label terlihat utuh.';
}
export function previewQuality(video){
  if(!video.videoWidth)return null;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=160;
  const quality=sample(canvas.getContext('2d',{willReadFrequently:true}),video,video.videoWidth,video.videoHeight);
  const r=cameraGuideRegions(video.videoWidth,video.videoHeight).gauge;
  return {quality,message:qualityMessage(quality,Math.min(r.width*video.videoWidth,r.height*video.videoHeight))};
}
export async function captureCamera({video,track,monitor=false,signal,onStatus}){
  check(signal);if(!video.videoWidth||track?.readyState!=='live')throw new Error('Tunggu kamera aktif dan fokus sebelum mengambil foto.');
  const sampling=document.createElement('canvas');sampling.width=sampling.height=160;
  const samplingContext=sampling.getContext('2d',{willReadFrequently:true});
  let still;
  if(typeof globalThis.ImageCapture==='function')try{still=new globalThis.ImageCapture(track);}catch{}
  let photoSettings={};
  if(still)try{const caps=await deviceOperation(()=>still.getPhotoCapabilities(),signal);photoSettings=chooseStillSettings(caps);}catch{check(signal);}
  async function takePhoto(){
    const original=await still.takePhoto(photoSettings),bitmap=await createImageBitmap(original);
    try{
      const quality=sample(samplingContext,bitmap,bitmap.width,bitmap.height);
      let blob=original,width=bitmap.width,height=bitmap.height;
      if(width*height>18000000||original.size>14*1024*1024||!['image/jpeg','image/png','image/webp'].includes(original.type)){
        const scale=Math.min(1,Math.sqrt(18000000/(width*height)));width=Math.floor(width*scale);height=Math.floor(height*scale);
        const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d').drawImage(bitmap,0,0,width,height);blob=await toBlob(canvas);canvas.width=canvas.height=1;
      }
      if(blob.size>15*1024*1024)throw new Error('Foto terlalu besar untuk upload.');
      return {blob,width,height,quality,score:quality.score};
    }finally{bitmap.close();}
  }
  async function takeFrame(){
    const width=video.videoWidth,height=video.videoHeight,canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    canvas.getContext('2d').drawImage(video,0,0);const quality=sample(samplingContext,canvas,width,height),blob=await toBlob(canvas);canvas.width=canvas.height=1;
    return {blob,width,height,quality,score:quality.score};
  }
  return selectCameraPhoto({takePhoto:still?takePhoto:undefined,takeFrame,monitor,signal,onStatus});
}
