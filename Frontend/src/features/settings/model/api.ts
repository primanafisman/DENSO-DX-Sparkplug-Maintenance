import {read,update} from '../../../shared/lib/api';
import type {MaintenanceSettings,MaintenanceCatalog,MaintenanceDefinition,DefinitionRevision,Page} from '../../../shared/lib/contracts';
import {settingsSchema} from './schemas';
import type {DefinitionUpdate} from './types';
export const settingsApi={settings:async()=>{const data=await read<MaintenanceSettings>('/maintenance/settings');settingsSchema.parse(data);return data;},catalog:()=>read<MaintenanceCatalog>('/maintenance/catalog'),save:(body:MaintenanceSettings&{review_reason?:string})=>update('/maintenance/settings',body),saveDefinition:({id,body}:{id:string;body:DefinitionUpdate})=>update<MaintenanceDefinition>('/maintenance/definitions/'+encodeURIComponent(id),body),revisions:(id:string)=>read<Page<DefinitionRevision>>('/maintenance/definitions/'+encodeURIComponent(id)+'/revisions')};
