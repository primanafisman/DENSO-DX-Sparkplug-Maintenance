import {useEffect,useRef} from 'react';
import {useStore} from 'zustand';
import {useNavigate} from 'react-router-dom';
import {captureStore,createCaptureStore} from '../model/captureStore';
import {captureApi} from '../model/api';
import {reviewSchema} from '../model/schemas';
import {newId} from '../../../shared/lib/id';
import {ApiError} from '../../../shared/lib/api';
import type {ROI,Instrument,Confirmation,AnalysisItem} from '../../../shared/lib/contracts';
import type {CaptureInput} from '../../maintenance/model/inspectionStore';
import {useInspectionStore,nextCapture} from '../../maintenance/model/inspectionStore';
const wait=(ms:number,signal:AbortSignal)=>new Promise<void>((resolve,reject)=>{const onAbort=()=>{clearTimeout(timer);reject(new DOMException('Dibatalkan','AbortError'));};const timer=setTimeout(()=>{signal.removeEventListener('abort',onAbort);resolve();},ms);signal.addEventListener('abort',onAbort,{once:true});});
type Review={final_value:string;identity_verified:boolean;verified:boolean;reason:string};
type Dependencies={api?:typeof captureApi;store?:ReturnType<typeof createCaptureStore>;getInput:()=>CaptureInput;onResult?:()=>void;sleep?:(ms:number,signal:AbortSignal)=>Promise<void>};
export function createCaptureFlow({api=captureApi,store=captureStore,getInput,onResult=()=>{},sleep=wait}:Dependencies){
  let generation=0,controller=new AbortController();
  const current=(id:number)=>id===generation&&!controller.signal.aborted;
  async function capacity<T>(operation:()=>Promise<T>,id:number,deadline:number):Promise<T>{for(;;){if(!current(id))throw new DOMException('Dibatalkan','AbortError');try{return await operation();}catch(error){if(!(error instanceof ApiError)||error.status!==429||Date.now()>=deadline)throw error;await sleep(1500,controller.signal);}}}
  const release=(keys:('sourceUrl'|'gaugeUrl'|'labelUrl')[])=>{for(const k of keys){const url=store.getState()[k];if(url)URL.revokeObjectURL(url);}};
  function invalidate(){controller.abort();controller=new AbortController();generation++;store.setState({result:null,pending:null,reading:null,stage:'idle',error:null,generation});return generation;}
  function failed(error:unknown,id:number){if(current(id)){store.setState({error,stage:'error'});onResult();}return null;}
  async function analyze(id:number){
    const state=store.getState(),photo=state.photo,profile=state.profile;if(!photo)return null;
    if(!profile){store.setState({stage:'ready'});onResult();return null;}
    const signal=controller.signal,item:AnalysisItem={client_id:'indicator',roi:state.roi,profile,...(state.label_roi?{label_roi:state.label_roi}:{}),...(state.instrument?{instrument_id:state.instrument.id}:{})};
    try{
      const deadline=Date.now()+120000;store.setState({stage:'queued'});let job=await capacity(()=>api.submit(photo.image_id,[item],photo.context.line,signal),id,deadline);let attempt=0;
      while(current(id)&&['queued','running'].includes(job.status)&&Date.now()<deadline){store.setState({stage:job.status==='queued'?'queued':'reading'});await sleep(Math.min(2000,300*(++attempt)),signal);if(!current(id))return null;job=await capacity(()=>api.job(job.job_id,signal),id,deadline);}
      if(!current(id))return null;
      if(job.status!=='completed'||!job.results[0])throw new Error('Pembacaan belum berhasil. Periksa crop atau ambil ulang foto.');
      release(['gaugeUrl','labelUrl']);const blobs=await Promise.allSettled([api.crop(photo.image_id,state.roi,signal),state.label_roi?api.crop(photo.image_id,state.label_roi,signal):Promise.resolve(null)]);
      if(!current(id))return null;const gauge=blobs[0].status==='fulfilled'?blobs[0].value:null,label=blobs[1].status==='fulfilled'?blobs[1].value:null;store.setState({result:job.results[0],stage:'ready',error:null,gaugeUrl:gauge?URL.createObjectURL(gauge):'',labelUrl:label?URL.createObjectURL(label):''});onResult();return job.results[0];
    }catch(error){return failed(error,id);}
  }
  async function upload(file:File){const id=invalidate(),input=structuredClone(getInput());release(['sourceUrl','gaugeUrl','labelUrl']);store.setState({file,sourceUrl:URL.createObjectURL(file),gaugeUrl:'',labelUrl:'',photo:null,discovery:null,instrument:null,stage:'uploading'});
    try{const photo=await api.upload(file,input.context,controller.signal);if(!current(id))return null;store.setState({photo,stage:'locating'});const [discovery,instruments]=await Promise.all([api.discover(photo.image_id,input.context.line,controller.signal),api.instruments()]);if(!current(id))return null;
      const proposed=discovery.instruments.find(p=>p.instrument?.id&&p.profile_source==='registered-equipment')??discovery.instruments[0];
      const linked=instruments.filter(a=>!input.definition||a.maintenance_check_ids.includes(input.definition.id));
      const instrument=linked.find(a=>a.id===proposed?.instrument?.id)??(input.definition&&linked.length===1?linked[0]:null);
      store.setState({discovery,instruments,instrument,proposalIndex:Math.max(0,discovery.instruments.indexOf(proposed)),roi:proposed?.roi??{x:0,y:0,width:1,height:1},label_roi:proposed?.label_roi??null,profile:instrument?.profile??proposed?.suggested_profile??null});return await analyze(id);
    }catch(error){return failed(error,id);}
  }
  async function selectInstrument(asset:Instrument|null){const id=invalidate();store.setState({instrument:asset,profile:asset?.profile??null});return analyze(id);}
  async function regions(roi:ROI,label_roi:ROI|null){const id=invalidate();store.setState({roi,label_roi});return analyze(id);}
  async function proposal(index:number){const p=store.getState().discovery?.instruments[index];if(!p)return;const id=invalidate();const asset=store.getState().instruments.find(a=>a.id===p.instrument?.id)??null;store.setState({proposalIndex:index,roi:p.roi,label_roi:p.label_roi??null,instrument:asset,profile:asset?.profile??p.suggested_profile??null});return analyze(id);}
  async function confirm(review:Review){const state=store.getState(),input=getInput();
    if(!review.identity_verified||!review.verified)throw new Error('Konfirmasi identitas alat dan hasil terlebih dahulu.');
    const parsed=reviewSchema.safeParse({...review,final_value:review.final_value.trim().replace(',','.')});if(!parsed.success)throw new Error('Periksa angka dan konfirmasi.');
    if(!state.result||!state.instrument||!input.definition)throw new Error('Pilih alat dan pemeriksaan, lalu analisis foto.');
    if((!state.result.confidence.valid||state.result.validated_prediction===null||Number(parsed.data.final_value)!==state.result.validated_prediction)&&!parsed.data.reason)throw new Error('Isi alasan pembacaan manual atau koreksi.');
    const data:Confirmation={analysis_id:state.result.analysis_id,instrument_id:state.instrument.id,final_value:parsed.data.final_value,identity_verified:true,verified:true,context:state.photo!.context,check_id:input.definition.id,sample_key:input.sample_id+(input.stage?':'+input.stage:''),reason:parsed.data.reason,confirmation_id:state.pending?.confirmation_id??newId()};
    if(state.pending&&JSON.stringify(data)!==JSON.stringify(state.pending))throw new Error('Konfirmasi sebelumnya belum pasti. Coba ulang permintaan yang sama atau periksa riwayat.');
    const id=generation;store.setState({pending:data});try{const reading=await api.confirm(data);if(!current(id))return null;store.setState({reading,pending:null});return reading;}catch(error){if(current(id)&&error instanceof ApiError&&error.status>=400&&error.status<500)store.setState({pending:null});throw error;}
  }
  return {upload,invalidate,selectInstrument,regions,proposal,confirm,reanalyse:()=>analyze(invalidate()),dispose:()=>{invalidate();release(['sourceUrl','gaugeUrl','labelUrl']);store.setState(store.getInitialState(),true);}};
}
export function useCaptureFlow(){const navigate=useNavigate(),state=useStore(captureStore);const ref=useRef<ReturnType<typeof createCaptureFlow>|null>(null);
  if(!ref.current)ref.current=createCaptureFlow({getInput:()=>{const draft=useInspectionStore.getState().draft;if(!draft)throw new Error('Mulai pemeriksaan terlebih dahulu.');return nextCapture(draft)??{definition:draft.definition,sample_id:draft.definition?.samples.at(-1)?.id??'n1',context:draft.context,checked_at:draft.checked_at};},onResult:()=>navigate('/pemeriksaan/hasil')});
  useEffect(()=>()=>ref.current?.dispose(),[]);return {state,engine:ref.current};
}
