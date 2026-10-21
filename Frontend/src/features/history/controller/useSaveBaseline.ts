import {useMutation,useQueryClient} from '@tanstack/react-query';
import {historyApi} from '../model/api';
export function useSaveBaseline(){const client=useQueryClient();return useMutation({mutationFn:historyApi.saveBaseline,onSuccess:()=>client.invalidateQueries({queryKey:['spc-baselines']})});}
