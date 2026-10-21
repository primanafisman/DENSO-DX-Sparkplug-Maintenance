import {useQuery} from '@tanstack/react-query';
import {dashboardApi} from '../model/api';
export function useMonthlySummary({month,line,shift}:{month:string;line?:string;shift?:string}){return useQuery({queryKey:['summary',month,line,shift],queryFn:({signal})=>dashboardApi.summary(month,line,shift,signal),enabled:!!month});}
