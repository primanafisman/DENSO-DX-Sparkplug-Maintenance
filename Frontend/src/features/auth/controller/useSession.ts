import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {sessionApi} from '../model/api';
import {useEffect} from 'react';
export function useSession(){
  const client=useQueryClient(),query=useQuery({queryKey:['session'],queryFn:sessionApi.me,retry:false,staleTime:60000});
  const login=useMutation({mutationFn:sessionApi.login,onSuccess:user=>client.setQueryData(['session'],user)});
  const logout=useMutation({mutationFn:sessionApi.logout,onSuccess:()=>{client.clear();window.dispatchEvent(new Event('spm:logout'));client.setQueryData(['session'],null);}});
  useEffect(()=>{const expire=()=>{client.clear();client.setQueryData(['session'],null);};window.addEventListener('spm:session-expired',expire);return()=>window.removeEventListener('spm:session-expired',expire);},[client]);
  return {user:query.data??null,status:query.isPending?'loading':query.data?'authenticated':'anonymous',login,logout} as const;
}
