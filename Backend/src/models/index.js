import {DataTypes} from 'sequelize';
const common={id:{type:DataTypes.STRING(64),primaryKey:true,allowNull:false},payload:{type:DataTypes.TEXT,allowNull:false},created_at:{type:DataTypes.STRING(40),allowNull:false}};
const field=(size=128)=>({type:DataTypes.STRING(size),allowNull:false});
export const definitions={
  users:{table:'SPM_M_User',fields:{username:{...field(64),unique:true},role:field(16)},indexes:[['username']]},
  instruments:{table:'SPM_M_Instrument',fields:{name:field(200)},indexes:[['name']]},
  calibrations:{table:'SPM_M_Calibration',fields:{instrument_id:field(64)},indexes:[['instrument_id','created_at']]},
  readings:{table:'SPM_T_Reading',fields:{confirmation_id:{...field(128),unique:true},analysis_id:{...field(64),unique:true},evidence_key:{...field(64),unique:true},instrument_id:field(64),line:field(64),production_date:field(10),shift:field(16),check_id:field(64),sample_key:field(64)},indexes:[['instrument_id','created_at'],['line','production_date','shift'],['confirmation_id'],['analysis_id'],['evidence_key'],['production_date','id'],['check_id','production_date','id']]},
  maintenanceDefinitions:{table:'SPM_M_MaintenanceDefinition',fields:{name:field(200)},indexes:[['name']]},
  maintenanceRecords:{table:'SPM_T_MaintenanceRecord',fields:{definition_id:field(64),line:field(64),production_date:field(10),shift:field(16)},indexes:[['definition_id','created_at'],['line','production_date','shift'],['production_date','id'],['definition_id','production_date','id']]},
  settings:{table:'SPM_M_Setting',fields:{},indexes:[]},
  audit:{table:'SPM_T_Audit',fields:{actor_id:field(64),action:field(64)},indexes:[['created_at']]},
  schema:{table:'SPM_M_Schema',fields:{},indexes:[]},
};
export function defineModels(sequelize){return Object.fromEntries(Object.entries(definitions).map(([name,def])=>[name,sequelize.define(name,{...common,...def.fields},{tableName:def.table,timestamps:false,freezeTableName:true})]));}
