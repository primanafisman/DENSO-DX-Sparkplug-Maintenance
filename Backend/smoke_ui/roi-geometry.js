const clamp=(value,minimum,maximum)=>Math.min(maximum,Math.max(minimum,value));
const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
const copy=roi=>({...roi});
const equal=(a,b)=>!!a===!!b&&(!a||['x','y','width','height'].every(key=>Math.abs(a[key]-b[key])<1e-7));

export function clampRoi(roi={},minimum=.000001){
  const width=clamp(finite(roi.width,1),minimum,1),height=clamp(finite(roi.height,1),minimum,1);
  return {x:clamp(finite(roi.x,0),0,1-width),y:clamp(finite(roi.y,0),0,1-height),width,height};
}

// All ROI coordinates refer to the original, oriented photograph. Zoom only
// affects this display transform and never changes the image sent for reading.
export function containTransform({imageWidth,imageHeight,viewportWidth,viewportHeight,zoom=1,panX=0,panY=0}){
  const scale=Math.min(viewportWidth/Math.max(1,imageWidth),viewportHeight/Math.max(1,imageHeight))*clamp(zoom,1,4);
  const width=imageWidth*scale,height=imageHeight*scale;
  panX=clamp(panX,-Math.max(0,(width-viewportWidth)/2),Math.max(0,(width-viewportWidth)/2));
  panY=clamp(panY,-Math.max(0,(height-viewportHeight)/2),Math.max(0,(height-viewportHeight)/2));
  return {left:(viewportWidth-width)/2+panX,top:(viewportHeight-height)/2+panY,width,height,panX,panY};
}

export function viewportToImage(point,transform){return {x:(point.x-transform.left)/transform.width,y:(point.y-transform.top)/transform.height};}
export function imageToViewport(roi,transform){return {left:transform.left+roi.x*transform.width,top:transform.top+roi.y*transform.height,width:roi.width*transform.width,height:roi.height*transform.height};}
export function moveRoi(roi,delta){return clampRoi({...roi,x:roi.x+delta.x,y:roi.y+delta.y});}
export function resizeRoi(roi,corner,delta,minimum=.02){
  let left=roi.x,top=roi.y,right=roi.x+roi.width,bottom=roi.y+roi.height;
  const minWidth=Math.min(minimum,roi.width),minHeight=Math.min(minimum,roi.height);
  if(corner.includes('w'))left=clamp(left+delta.x,0,right-minWidth);
  if(corner.includes('e'))right=clamp(right+delta.x,left+minWidth,1);
  if(corner.includes('n'))top=clamp(top+delta.y,0,bottom-minHeight);
  if(corner.includes('s'))bottom=clamp(bottom+delta.y,top+minHeight,1);
  return {x:left,y:top,width:right-left,height:bottom-top};
}
export function scaleRoi(roi,factor){
  const width=clamp(roi.width*factor,.000001,1),height=clamp(roi.height*factor,.000001,1);
  return clampRoi({x:roi.x+(roi.width-width)/2,y:roi.y+(roi.height-height)/2,width,height});
}
export function proposeLabelRoi(gauge){
  const height=clamp(gauge.height*.28,.08,.22);
  return clampRoi({x:gauge.x,y:Math.min(gauge.y+gauge.height+.015,1-height),width:gauge.width,height});
}

export function createRoiState(initial,onChange=()=>{}){
  let gauge,label,labelEnabled;
  function getRegions(){return {roi:copy(gauge),label_roi:labelEnabled?copy(label):null};}
  function setRegions({roi,label_roi}){gauge=clampRoi(roi);label=label_roi?clampRoi(label_roi):proposeLabelRoi(gauge);labelEnabled=!!label_roi;}
  function update(kind,value){
    const next=clampRoi(value),previous=kind==='label'?label:gauge;
    if(equal(previous,next))return false;
    if(kind==='label'){label=next;labelEnabled=true;}else gauge=next;
    onChange(getRegions());return true;
  }
  function setLabelEnabled(enabled){
    if(labelEnabled===!!enabled)return false;
    labelEnabled=!!enabled;onChange(getRegions());return true;
  }
  setRegions(initial);
  return {getRegions,setRegions,update,setLabelEnabled,getLabel:()=>copy(label),isLabelEnabled:()=>labelEnabled};
}
