import type {ROI} from '../../../shared/lib/contracts';
const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
export function clampRoi(r:ROI):ROI{const width=clamp(r.width,.000001,1),height=clamp(r.height,.000001,1);return {x:clamp(r.x,0,1-width),y:clamp(r.y,0,1-height),width,height};}
export function containTransform(iw:number,ih:number,vw:number,vh:number,zoom=1,panX=0,panY=0){const scale=Math.min(vw/Math.max(1,iw),vh/Math.max(1,ih))*clamp(zoom,1,4),width=iw*scale,height=ih*scale;panX=clamp(panX,-Math.max(0,(width-vw)/2),Math.max(0,(width-vw)/2));panY=clamp(panY,-Math.max(0,(height-vh)/2),Math.max(0,(height-vh)/2));return {left:(vw-width)/2+panX,top:(vh-height)/2+panY,width,height,panX,panY};}
export function viewportToImage(p:{x:number;y:number},t:ReturnType<typeof containTransform>){return {x:(p.x-t.left)/t.width,y:(p.y-t.top)/t.height};}
export function moveRoi(r:ROI,d:{x:number;y:number}){return clampRoi({...r,x:r.x+d.x,y:r.y+d.y});}
export function resizeRoi(r:ROI,d:{x:number;y:number}){return {...r,width:clamp(r.width+d.x,.01,1-r.x),height:clamp(r.height+d.y,.01,1-r.y)};}
export function guideRegions(width:number,height:number){const side=Math.min(width*.78,height*.68),gap=side*.025,labelHeight=side*.22,x=(width-side)/2/width,y=(height-side-gap-labelHeight)/2/height;return {gauge:{x,y,width:side/width,height:side/height},label:{x,y:y+(side+gap)/height,width:side/width,height:labelHeight/height}};}
export function labelBelow(g:ROI){const height=clamp(g.height*.25,.06,.2);return clampRoi({x:g.x,y:Math.min(1-height,g.y+g.height+.015),width:g.width,height});}
