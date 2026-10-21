function cell(value,numeric=false){let text=value===null||value===undefined?'':String(value);if(!numeric&&/^[\s]*[=+\-@\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}
const row=(values,numbers=[])=>values.map((v,i)=>cell(v,numbers.includes(i))).join(',')+'\r\n';
export function createReportExportService(reports,baselines){return {
  async export(input,{report_kind='checksheet',baseline_id}={}){
    const chunks=['\uFEFF'];
    if(report_kind==='checksheet'){
      chunks.push(row(['record_id','date','checked_at','line','shift','slot','check','equipment','Type','sample','value','unit','status','sampler','as_of']));
      let cursor,as_of=input.as_of;
      do{
        const report=await reports.checksheet({...input,...(as_of?{as_of}:{})},{limit:100,cursor});as_of=report.meta.as_of;
        for(const group of report.rows)for(const cell of group.cells)for(const o of cell.occurrences)for(const sample of o.outcomes)chunks.push(row([o.id,o.context.production_date,o.checked_at,o.context.line,o.context.shift,o.slot_id,group.name,group.equipment_name,o.product_snapshot?.name??'Tidak tercatat',sample.sample_id,sample.value,group.unit,sample.status,o.context.sampler,as_of],[10]));
        cursor=report.next_cursor;
      }while(cursor);
    }else{
      const baseline=baseline_id?await baselines.get(baseline_id):null;
      let report=await reports.spc(input,{method:baseline?.method});if(baseline)report=await baselines.apply(report,baseline_id);
      chunks.push(row(['cohort','record_id','checked_at','Type','sample','value','xbar','R','unit','status','as_of']));
      for(const cohort of report.cohorts){
        let cursor;do{const groups=await reports.subgroups({...input,as_of:report.meta.as_of},{cohort_id:cohort.cohort_id,limit:100,cursor,method:baseline?.method});
          for(const group of groups.items)for(const [i,sample] of group.occurrence.outcomes.entries())chunks.push(row([cohort.cohort_id,group.occurrence.id,group.occurrence.checked_at,group.occurrence.product_snapshot?.name??'Tidak tercatat',sample.sample_id,group.values[i]??sample.value,group.xbar,group.r,cohort.unit,sample.status,report.meta.as_of],[5,6,7]));
          cursor=groups.next_cursor;
        }while(cursor);
        for(const [key,value] of Object.entries({...cohort.statistics,...cohort.control_limits,cp:cohort.capability.cp,cpk:cohort.capability.cpk,method:cohort.capability.method,baseline_id:cohort.baseline.id}).filter(([,v])=>v===null||typeof v!=='object'))chunks.push(row(['STAT',cohort.cohort_id,key,value],typeof value==='number'?[3]:[]));
      }
    }
    return chunks.join('');
  },
};}
