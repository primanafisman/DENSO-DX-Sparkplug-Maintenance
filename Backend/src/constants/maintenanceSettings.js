export const LINE_OPTIONS=Object.freeze(Array.from({length:17},(_,i)=>String(i+1)));
export const DEFAULT_MAINTENANCE_SETTINGS=Object.freeze({lines:LINE_OPTIONS,allowed_samplers:Object.freeze(['Ldr']),night_rollover_hour:12});

export const MAX_EQUIPMENT_CHECK_LINKS=500;
