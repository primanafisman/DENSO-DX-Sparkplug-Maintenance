import {MaintenanceClient} from '/contracts/frontend-client.js';
import {createAutoAnalysis} from '/smoke/auto-analysis.js';
import {cameraMode,confirmationId as makeConfirmationId} from '/smoke/camera-support.js';
import {createRoiEditor} from '/smoke/roi-editor.js';
import {cameraGuideRegions,fitVideo,configureCamera,captureCamera,previewQuality} from '/smoke/camera-capture.js';

const api=new MaintenanceClient(),element=id=>document.getElementById(id);
let photo,result,resultCapture,resultToken,photoCheckedAt,assets=[],catalog=[],cameraStream,previewUrl,confirmationId;
let busy=false,progressTimer,photoGeneration=0,cropRevision=0,cameraGeneration=0,cameraTimer,cameraAbort,captureNote='';
const flow=createAutoAnalysis({api,onProgress:analysisProgress,onPrepared:prepareCapture});
const captureState=flow.state;
const roiEditor=createRoiEditor({root:element('roi-editor'),image:element('photo-preview'),onChange:invalidate});
function show(id){for(const section of document.querySelectorAll('main>section'))section.hidden=section.id!==id;if(id!=='capture')closeCamera();if(id==='crop')requestAnimationFrame(()=>roiEditor.refresh());window.scrollTo(0,0);}
function error(problem){element('error-message').textContent=problem.message||String(problem);if(!element('error-dialog').open)element('error-dialog').showModal();}
function action(id,handler){element(id).addEventListener('click',async()=>{const button=element(id);button.disabled=true;try{await handler();}catch(problem){error(problem);}finally{button.disabled=false;}});}
function context(){return {line:element('line').value,production_date:element('date').value,shift:element('shift').value,sampler:element('sampler').value};}
function profile(){return {kind:element('kind').value,unit:element('unit').value,minimum:Number(element('minimum').value),maximum:Number(element('maximum').value),decimals:Number(element('decimals').value),tolerance:Number(element('tolerance').value)};}
function roi(prefix='roi'){return Object.fromEntries(['x','y','width','height'].map(name=>[name,Number(element(prefix+'-'+name).value)]));}
function setRoi(prefix,value){for(const [key,item] of Object.entries(value))element(prefix+'-'+key).value=item;}
function options(id,items,placeholder){const select=element(id);select.replaceChildren();if(placeholder){const option=document.createElement('option');option.value='';option.textContent=placeholder;select.append(option);}for(const item of items){const option=document.createElement('option');option.value=item.id;option.textContent=item.name||item.label||item.id;select.append(option);}}
function applyProfile(value){for(const [key,item] of Object.entries(value))if(element(key))element(key).value=item;}
function invalidate(){cropRevision++;flow.cancel();result=resultCapture=resultToken=null;const preview=element('adjustment-preview');if(preview){if(preview.dataset.url)URL.revokeObjectURL(preview.dataset.url);delete preview.dataset.url;preview.removeAttribute('src');preview.hidden=true;}}
async function serverSchedule(apply=true){
  const schedule=await api.request('/maintenance/schedule');
  if(apply){
    options('check-slot',schedule.schedule.map(slot=>({id:slot.slot_id,label:slot.slot_label})));
    element('check-slot').value=schedule.slot_id;element('shift').value=schedule.shift;element('date').value=schedule.production_date;
    const time=new Intl.DateTimeFormat('id-ID',{timeZone:schedule.timezone,hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date(schedule.server_time));
    element('server-time').textContent='Waktu server '+time+' WIB · '+schedule.slot_label;
  }
  return schedule;
}
async function load(){
  assets=(await api.request('/instruments?limit=100')).items;catalog=(await api.request('/maintenance/catalog')).items;
  for(const id of ['equipment','confirm-equipment'])options(id,assets,'Pilih nama alat');
  options('edit-equipment',assets,'Tambah alat');options('check',catalog);options('maintenance-check',catalog);maintenanceFields();
}
async function cameraHelp(){
  const native=cameraMode(window.isSecureContext,navigator.mediaDevices)==='native';
  element('camera-help').textContent=native?'Kamera bawaan HP: ikuti panduan gauge + label di atas. Bingkai langsung tersedia melalui HTTPS lokal.':'Kamera web siap: arahkan gauge dan label ke bingkai, lalu ambil foto.';
  const capabilities=await api.request('/capabilities');
  if(native&&capabilities.local_https?.enabled){
    const url=new URL(window.location.href);url.protocol='https:';url.port=capabilities.local_https.port;url.pathname='/';url.search='';url.hash='';
    element('https-link').href=url.href;element('https-help').hidden=false;
  }
}
action('sign-in',async()=>{await api.login(element('username').value,element('password').value);element('password').value='';await load();await serverSchedule();await cameraHelp();show('capture');});
for(const button of document.querySelectorAll('[data-go]'))button.addEventListener('click',async()=>{
  if(!api.csrfToken||busy)return;
  if(button.dataset.go==='capture'){invalidate();photo=null;try{await serverSchedule();}catch(problem){error(problem);return;}}
  show(button.dataset.go);
});
action('close-error',()=>element('error-dialog').close());
function setBusy(value){busy=value;for(const button of document.querySelectorAll('nav button'))button.disabled=value;if(!value)clearInterval(progressTimer);}
function analysisProgress(stage){
  const messages={uploading:'Mengirim dan memeriksa foto…',discovering:'Mencari crop gauge dan label; mencocokkan daftar alat…',submitting:'Menyiapkan pembacaan lokal…',queued:'Menunggu giliran pembacaan…',running:'CV lokal sedang membaca angka atau jarum…',complete:'Pembacaan selesai. Menyiapkan crop…',adjustment:'Atur crop dan profil sebelum pembacaan.',error:'Analisis terhenti. Periksa pesan yang tampil.'};
  element('analysis-stage').textContent=messages[stage];
  const step={uploading:0,discovering:1,submitting:2,queued:2,running:2,complete:3}[stage];
  ['uploading','discovering','running','complete'].forEach((id,index)=>{element('stage-'+id).classList.toggle('active',index===step);element('stage-'+id).classList.toggle('done',index<step);});
}
function startProgress(){setBusy(true);show('processing');const started=performance.now();element('analysis-elapsed').textContent='';clearInterval(progressTimer);progressTimer=setInterval(()=>{element('analysis-elapsed').textContent=Math.floor((performance.now()-started)/1000)+' detik · foto yang rumit dapat memerlukan waktu lebih lama';},1000);}
function prepareCapture(capture){
  photo=capture.photo;setRoi('roi',capture.roi);
  element('label-enabled').checked=!!capture.label_roi;setRoi('label',capture.label_roi||{x:0,y:.7,width:1,height:.3});
  roiEditor.setRegions({roi:capture.roi,label_roi:capture.label_roi});
  element('equipment').value=capture.instrument_id;
  applyProfile(capture.profile||{kind:'auto',unit:'MPa',minimum:0,maximum:1,decimals:3,tolerance:.01});
  element('label-info').textContent=capture.label?.raw_text||'Label belum ditemukan. Pilih alat atau atur ROI label.';
}
function resetPreviews(){for(const id of ['crop-preview','label-preview','adjustment-preview']){const image=element(id);if(image.dataset.url)URL.revokeObjectURL(image.dataset.url);delete image.dataset.url;image.removeAttribute('src');}element('adjustment-preview').hidden=true;element('label-preview-panel').hidden=true;}
async function upload(file,note='Foto diunggah'){
  const generation=++photoGeneration;invalidate();photo=null;confirmationId=null;resetPreviews();element('saved').textContent='';
  captureNote=note;
  if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(file);roiEditor.setImage(previewUrl);
  startProgress();element('analysis-stage').textContent='Menentukan jadwal dari waktu server…';
  try{
    const schedule=await serverSchedule();if(generation!==photoGeneration)return;photoCheckedAt=schedule.server_time;
    const completed=await flow.upload(file,context());
    if(generation!==photoGeneration||!completed)return;
    if(completed.needsAdjustment){element('label-info').textContent='Indikator belum ditemukan. Atur crop, satuan dan profil, lalu baca ulang.';show('crop');}
    else await displayResult(completed);
  }catch(problem){if(generation===photoGeneration){show(photo?'crop':'capture');throw problem;}}
  finally{if(generation===photoGeneration)setBusy(false);}
}
for(const id of ['upload','camera-native'])element(id).addEventListener('change',async event=>{const file=event.target.files[0];if(file)try{closeCamera();await upload(file,id==='camera-native'?'Foto kamera bawaan HP':'Foto diunggah');}catch(problem){error(problem);}finally{event.target.value='';}});
action('cancel-analysis',()=>{photoGeneration++;invalidate();setBusy(false);show('capture');});
action('open-camera',async()=>{
  if(cameraMode(window.isSecureContext,navigator.mediaDevices)==='native'){element('camera-native').click();return;}
  closeCamera();const generation=cameraGeneration;
  const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:3840},height:{ideal:2160}},audio:false});
  if(generation!==cameraGeneration){stream.getTracks().forEach(track=>track.stop());return;}
  cameraStream=stream;cameraAbort=new AbortController();element('camera').srcObject=stream;element('camera-panel').hidden=false;element('take-photo').disabled=true;
  element('camera-capture-status').textContent='Menyiapkan fokus kamera…';
  await configureCamera(stream.getVideoTracks()[0]);
  if(generation!==cameraGeneration)return;
  await element('camera').play();
  if(generation!==cameraGeneration)return;
  updateCameraGuide();element('take-photo').disabled=false;element('camera-capture-status').textContent='';
  cameraTimer=setInterval(()=>{updateCameraGuide();const quality=previewQuality(element('camera'));if(quality)element('camera-quality').textContent=quality.message;},800);
});
function updateCameraGuide(){
  const video=element('camera');if(!video.videoWidth)return;
  const fit=fitVideo(video.videoWidth,video.videoHeight,video.clientWidth,video.clientHeight),layer=element('camera-guides');
  Object.assign(layer.style,{left:fit.x+'px',top:fit.y+'px',width:fit.width+'px',height:fit.height+'px'});
  const regions=cameraGuideRegions(video.videoWidth,video.videoHeight);
  for(const kind of ['gauge','label']){const r=regions[kind],box=layer.querySelector('[data-camera-guide="'+kind+'"]');Object.assign(box.style,{left:r.x*100+'%',top:r.y*100+'%',width:r.width*100+'%',height:r.height*100+'%'});}
}
function closeCamera(){cameraGeneration++;cameraAbort?.abort();clearInterval(cameraTimer);cameraStream?.getTracks().forEach(track=>track.stop());cameraStream=null;element('camera-panel').hidden=true;element('take-photo').disabled=true;}
element('camera').addEventListener('resize',updateCameraGuide);window.addEventListener('resize',updateCameraGuide);
element('camera-mode').addEventListener('change',()=>{element('monitor-tip').hidden=element('camera-mode').value!=='monitor';});
action('camera-native-fallback',()=>{closeCamera();element('camera-native').click();});
action('close-camera',closeCamera);
window.addEventListener('pagehide',()=>{closeCamera();flow.cancel();clearInterval(progressTimer);resetPreviews();if(previewUrl)URL.revokeObjectURL(previewUrl);});
action('take-photo',async()=>{
  try{
    const selected=await captureCamera({video:element('camera'),track:cameraStream?.getVideoTracks()[0],monitor:element('camera-mode').value==='monitor',signal:cameraAbort?.signal,onStatus:text=>element('camera-capture-status').textContent=text});
    const note=(selected.source==='still'?'Foto resolusi kamera':'Frame kamera terpilih')+' · '+selected.width+' × '+selected.height+' px';
    closeCamera();await upload(new File([selected.blob],'camera.jpg',{type:selected.blob.type||'image/jpeg'}),note);
  }catch(problem){if(problem.name!=='AbortError'){element('camera-capture-status').textContent='Pengambilan gagal. Gunakan kamera bawaan HP atau coba kembali.';throw problem;}}
});
element('equipment').addEventListener('change',()=>{const selected=assets.find(a=>a.id===element('equipment').value);if(selected)applyProfile(selected.profile);invalidate();});
async function cropPreview(photoId,crop,target='crop-preview',token,stillCurrent=()=>true){
  const response=await fetch('/api/v1/photos/'+photoId+'/crop',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json','X-CSRF-Token':api.csrfToken},body:JSON.stringify(crop)});
  if(!response.ok)throw new Error((await response.json()).message);
  const blob=await response.blob();if((token&&!captureState.current(token))||!stillCurrent())return false;
  const image=element(target);if(image.dataset.url)URL.revokeObjectURL(image.dataset.url);image.src=image.dataset.url=URL.createObjectURL(blob);
  return true;
}
action('preview-crop',async()=>{if(!photo)throw new Error('Upload foto dahulu.');roiEditor.syncFromInputs();const revision=cropRevision,id=photo.image_id;const current=()=>cropRevision===revision&&photo?.image_id===id;if(await cropPreview(id,roi(),'adjustment-preview',undefined,current))if(current())element('adjustment-preview').hidden=false;});
async function displayResult(completed){
  if(!captureState.current(completed.token))return;
  result=completed.result;resultCapture=completed.capture;resultToken=completed.token;confirmationId=makeConfirmationId();
  const capture=resultCapture;
  element('read-value').textContent=result.candidate?.value==null?'Belum terbaca':Number(result.candidate.value).toFixed(capture.profile.decimals)+' '+(result.candidate.unit||capture.profile.unit);
  element('confidence').textContent='Confidence: '+(result.confidence?.level||'low')+' · periksa foto sebelum simpan';
  element('capture-result-note').textContent=captureNote+' · sumber '+capture.photo.source_width+' × '+capture.photo.source_height+' px';
  element('reason').textContent=result.candidate?.reason||result.error?.message||'';
  element('final-value').value=result.candidate?.value??'';
  element('confirm-equipment').value=capture.instrument_id;
  element('identity-verified').checked=false;element('value-verified').checked=false;element('correction').value='';
  const label=result.label||capture.label;
  element('result-label').textContent=label?.raw_text?'Label terbaca: '+label.raw_text:'Label belum terbaca; pilih nama alat secara manual.';
  const selected=assets.find(asset=>asset.id===capture.instrument_id);
  if(selected){element('result-label').textContent+=' · Daftar alat: '+selected.name;const matchedCheck=selected.maintenance_check_ids.find(id=>catalog.some(check=>check.id===id));if(matchedCheck)element('check').value=matchedCheck;}
  resetPreviews();
  await cropPreview(capture.photo.image_id,capture.roi,'crop-preview',completed.token);
  if(capture.label_roi){await cropPreview(capture.photo.image_id,capture.label_roi,'label-preview',completed.token);if(captureState.current(completed.token))element('label-preview-panel').hidden=false;}
  if(captureState.current(completed.token))show('result');
}
action('analyze',async()=>{
  if(!photo)throw new Error('Upload foto terlebih dahulu.');
  roiEditor.syncFromInputs();
  if(JSON.stringify(photo.context)!==JSON.stringify(context()))throw new Error('Line atau jadwal berubah; upload foto kembali.');
  const generation=++photoGeneration;startProgress();try{const completed=await flow.analyze({photo,roi:roi(),label_roi:element('label-enabled').checked?roi('label'):null,profile:profile(),instrument_id:element('equipment').value});if(completed)await displayResult(completed);}catch(problem){if(generation===photoGeneration){show('crop');throw problem;}}finally{if(generation===photoGeneration)setBusy(false);}
});
action('confirm',async()=>{
  if(!result||!captureState.current(resultToken))throw new Error('Foto/crop/profil berubah; baca ulang foto.');
  if(element('final-value').value.trim()==='')throw new Error('Isi nilai akhir sesuai foto.');
  const saved=await api.request('/readings/confirm',{method:'POST',body:{analysis_id:result.analysis_id,instrument_id:element('confirm-equipment').value,final_value:Number(element('final-value').value),verified:element('value-verified').checked,identity_verified:element('identity-verified').checked,context:resultCapture.photo.context,check_id:element('check').value,sample_key:element('sample').value,reason:element('correction').value,confirmation_id:confirmationId}});
  element('saved').textContent='Tersimpan. ID hasil: '+saved.id;
});
element('final-value').addEventListener('input',()=>{element('value-verified').checked=false;confirmationId=makeConfirmationId();});
element('confirm-equipment').addEventListener('change',()=>{element('identity-verified').checked=false;confirmationId=makeConfirmationId();});
for(const id of ['kind','unit','minimum','maximum','decimals','tolerance','equipment','line','sampler'])element(id).addEventListener('input',invalidate);
setInterval(async()=>{if(api.csrfToken&&!busy&&!element('capture').hidden&&!cameraStream)try{await serverSchedule();}catch{element('server-time').textContent='Waktu server belum tersedia; periksa koneksi sebelum mengambil foto.';}},30000);
function maintenanceFields(){const definition=catalog.find(c=>c.id===element('maintenance-check').value);if(!definition)return;element('requirements').textContent=definition.standard_text+' · '+definition.method_text;options('interval',definition.intervals.map(id=>({id})));options('trigger',definition.triggers.map(id=>({id})));const parent=element('observations');parent.replaceChildren();for(const sample of definition.samples){const row=document.createElement('div'),label=document.createElement('label');label.textContent=sample.label;row.append(label);if(definition.input_method==='ok_ng'){const select=document.createElement('select');select.dataset.sample=sample.id;for(const value of ['OK','NG']){const option=document.createElement('option');option.textContent=value;select.append(option);}row.append(select);}else{for(const stage of definition.kind==='difference'?['before','after']:['reading']){const input=document.createElement('input');input.placeholder='ID hasil foto '+stage;input.dataset.sample=sample.id;input.dataset.stage=stage;row.append(input);}}parent.append(row);}}
element('maintenance-check').addEventListener('change',maintenanceFields);
action('save-maintenance',async()=>{const chosen=catalog.find(c=>c.id===element('maintenance-check').value);const schedule=await serverSchedule(chosen?.input_method==='ok_ng');const checkTime=chosen?.input_method==='ok_ng'?schedule.server_time:(photoCheckedAt||schedule.server_time);const definition=catalog.find(c=>c.id===element('maintenance-check').value),observations=definition.samples.map(sample=>{const fields=[...element('observations').querySelectorAll('[data-sample]')].filter(f=>f.dataset.sample===sample.id);if(definition.input_method==='ok_ng')return {sample_id:sample.id,status:fields[0].value};if(definition.kind==='difference')return {sample_id:sample.id,before_reading_id:fields[0].value,after_reading_id:fields[1].value};return {sample_id:sample.id,reading_id:fields[0].value};});const saved=await api.request('/maintenance/records',{method:'POST',body:{definition_id:definition.id,context:context(),interval:element('interval').value,trigger:element('trigger').value,checked_at:checkTime,observations}});element('maintenance-status').textContent=saved.overall_status+' · ID '+saved.id;});
element('edit-equipment').addEventListener('change',()=>{const asset=assets.find(a=>a.id===element('edit-equipment').value);if(!asset)return;for(const [id,key] of [['asset-name','name'],['asset-code','code'],['asset-area','area'],['asset-type','instrument_type']])element(id).value=asset[key];element('asset-aliases').value=asset.aliases.join(', ');element('asset-checks').value=asset.maintenance_check_ids.join(', ');element('asset-active').checked=asset.active;applyProfile(asset.profile);});
action('save-equipment',async()=>{const id=element('edit-equipment').value;await api.request('/instruments'+(id?'/'+id:''),{method:id?'PUT':'POST',body:{name:element('asset-name').value,code:element('asset-code').value,aliases:element('asset-aliases').value.split(',').map(s=>s.trim()).filter(Boolean),area:element('asset-area').value,instrument_type:element('asset-type').value,active:element('asset-active').checked,maintenance_check_ids:element('asset-checks').value.split(',').map(s=>s.trim()).filter(Boolean),profile:profile()}});await load();show('settings');});


