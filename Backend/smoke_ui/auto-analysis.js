import {createCaptureState} from './capture-state.js';

// Recognition does not persist a reading. Only the separate confirmation action saves.
export function createAutoAnalysis({api,state=createCaptureState(),onProgress=()=>{},onPrepared=()=>{},sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),now=()=>Date.now()}){
  let generation=0;
  const current=id=>id===generation;
  function cancel(){generation++;state.invalidate();}
  function progress(id,stage){if(current(id))onProgress(stage);}
  async function analyzeCapture(capture,id){
    const token=state.begin(capture),snapshot=token.capture;
    const item={client_id:'indicator-1',roi:snapshot.roi,profile:snapshot.profile};
    if(snapshot.label_roi)item.label_roi=snapshot.label_roi;
    if(snapshot.instrument_id)item.instrument_id=snapshot.instrument_id;
    progress(id,'submitting');
    let pending=await api.submit(snapshot.photo.image_id,[item],snapshot.photo.context.line);
    const deadline=now()+180000;
    while(current(id)&&state.current(token)&&['queued','running'].includes(pending.status)&&now()<deadline){
      progress(id,pending.status);
      await sleep(1000);
      if(!current(id)||!state.current(token))return null;
      pending=await api.request('/analysis-jobs/'+pending.job_id);
    }
    if(!current(id)||!state.current(token))return null;
    if(pending.status!=='completed'||!pending.results?.[0])throw new Error('Analisis belum berhasil. Periksa crop atau ambil ulang foto.');
    const completed=state.finish(token,pending.results[0]);
    progress(id,'complete');
    return {...completed,token};
  }
  return {state,cancel,
    async upload(file,context){
      cancel();const id=generation;
      try {
        progress(id,'uploading');
        const photo=await api.upload(file,structuredClone(context));
        if(!current(id))return null;
        progress(id,'discovering');
        const discovery=await api.request('/photos/'+photo.image_id+'/discovery',{method:'POST',body:{area:photo.context.line}});
        if(!current(id))return null;
        const proposals=discovery.instruments||[];
        const proposed=proposals.find(p=>p.instrument?.id&&p.profile_source==='registered-equipment')||proposals.find(p=>p.suggested_profile)||proposals[0];
        const capture={photo,roi:proposed?.roi||{x:0,y:0,width:1,height:1},label_roi:proposed?.label_roi||null,profile:proposed?.suggested_profile||null,instrument_id:proposed?.instrument?.id||'',label:proposed?.label||null};
        onPrepared(capture);
        if(!capture.profile){progress(id,'adjustment');return {needsAdjustment:true,capture};}
        return await analyzeCapture(capture,id);
      }catch(error){if(!current(id))return null;progress(id,'error');throw error;}
    },
    async analyze(capture){cancel();const id=generation;try{return await analyzeCapture(capture,id);}catch(error){if(!current(id))return null;progress(id,'error');throw error;}},
  };
}
