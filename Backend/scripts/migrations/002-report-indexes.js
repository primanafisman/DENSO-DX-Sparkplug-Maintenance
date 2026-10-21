import {definitions} from '../../src/models/index.js';

export async function up(db,transaction){
  const query=db.getQueryInterface();
  for(const name of ['readings','maintenanceRecords']){
    const def=definitions[name],existing=await query.showIndex(def.table,{transaction});
    for(const [i,fields] of def.indexes.entries()){
      const indexName=`IX_${def.table}_${i}`;
      if(!existing.some(index=>index.name===indexName))await query.addIndex(def.table,fields,{name:indexName,transaction});
    }
  }
}
