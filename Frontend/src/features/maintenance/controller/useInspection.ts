import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {useNavigate} from 'react-router-dom';
import {useState} from 'react';
import {inspectionApi} from '../model/api';
import {useInspectionStore} from '../model/inspectionStore';
import type {MaintenanceDefinition} from '../../../shared/lib/contracts';
import {contextFormSchema} from '../model/schemas';
import {ApiError} from '../../../shared/lib/api';
export function useInspection({scheduleEnabled=true}={}){
  const schedule=useQuery({queryKey:['schedule'],queryFn:inspectionApi.schedule,refetchInterval:60000,enabled:scheduleEnabled}),store=useInspectionStore(),navigate=useNavigate(),client=useQueryClient();
  const [error,setError]=useState<unknown>(null),[uncertain,setUncertain]=useState(false);
  const start=async(definition:MaintenanceDefinition|null,selection:{line:string;sampler:string;product_type_id?:string})=>{try{const c=contextFormSchema.parse(selection),fresh=await inspectionApi.schedule();store.start({definition,context:{line:c.line,sampler:c.sampler,shift:fresh.shift,production_date:fresh.production_date,...(c.product_type_id?{product_type_id:c.product_type_id}:{})},checked_at:fresh.server_time,interval:definition?.intervals[0]??'per_shift',trigger:definition?.triggers[0]??'routine'});navigate(definition?.input_method==='ok_ng'?'/pemeriksaan/visual':'/pemeriksaan/foto');}catch(e){setError(e);}};
  const save=useMutation({mutationFn:async()=>{const d=useInspectionStore.getState().draft;if(!d?.definition)throw new Error('Pilih pemeriksaan.');return inspectionApi.save({definition_id:d.definition.id,context:d.context,checked_at:d.checked_at,interval:d.interval,trigger:d.trigger,observations:d.definition.samples.map(s=>d.observations.find(o=>o.sample_id===s.id)!).filter(Boolean)});},onSuccess:record=>{store.complete(record);client.invalidateQueries({queryKey:['history']});client.invalidateQueries({queryKey:['summary']});navigate('/pemeriksaan/selesai');},onError:e=>{if(e instanceof ApiError&&e.status===0)setUncertain(true);setError(e);}});
  return {...store,schedule,start,save,error,clearError:()=>setError(null),uncertain,allowAfterReview:()=>setUncertain(false)};
}
