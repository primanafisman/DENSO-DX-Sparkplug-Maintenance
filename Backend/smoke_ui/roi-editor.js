import {clampRoi,containTransform,viewportToImage,imageToViewport,moveRoi,resizeRoi,scaleRoi,createRoiState} from './roi-geometry.js';

export function pointerDragIntent({mode='box',overBox,zoom}){
  if(mode==='photo')return zoom>1?'pan':null;
  return overBox?'roi':zoom>1?'pan':null;
}

export function createRoiEditor({root,image,onChange=()=>{}}){
  const document=root.ownerDocument,stage=root.querySelector('[data-roi-stage]');
  const byId=id=>document.getElementById(id),fields=['x','y','width','height'];
  const boxes=Object.fromEntries(['gauge','label'].map(kind=>[kind,root.querySelector(`[data-roi-box="${kind}"]`)]));
  let active='gauge',dragMode='box',zoom=1,panX=0,panY=0,transform,drag;
  const listeners=[];
  function listen(target,event,handler){target.addEventListener(event,handler);listeners.push(()=>target.removeEventListener(event,handler));}
  function read(prefix){return Object.fromEntries(fields.map(key=>[key,Number(byId(prefix+'-'+key).value)]));}
  function writeInputs(){
    const regions=state.getRegions();
    for(const [prefix,roi] of [['roi',regions.roi],['label',state.getLabel()]])for(const key of fields)byId(prefix+'-'+key).value=String(roi[key]);
    byId('label-enabled').checked=state.isLabelEnabled();
  }
  const state=createRoiState({roi:read('roi'),label_roi:byId('label-enabled').checked?read('label'):null},regions=>{writeInputs();render();onChange(regions);});
  function currentRoi(){return active==='gauge'?state.getRegions().roi:state.getLabel();}
  function render(){
    const width=stage.clientWidth,height=stage.clientHeight;
    if(!width||!height||!image.naturalWidth)return;
    // Keep edge handles fully reachable even when the crop covers the photo.
    const gutter=22;
    transform=containTransform({imageWidth:image.naturalWidth,imageHeight:image.naturalHeight,viewportWidth:Math.max(1,width-2*gutter),viewportHeight:Math.max(1,height-2*gutter),zoom,panX,panY});
    transform.left+=gutter;transform.top+=gutter;
    panX=transform.panX;panY=transform.panY;
    Object.assign(image.style,{left:transform.left+'px',top:transform.top+'px',width:transform.width+'px',height:transform.height+'px'});
    const regions=state.getRegions();
    for(const kind of ['gauge','label']){
      const box=boxes[kind],rect=imageToViewport(kind==='gauge'?regions.roi:state.getLabel(),transform);
      Object.assign(box.style,Object.fromEntries(Object.entries(rect).map(([key,value])=>[key,value+'px'])));
      box.classList.toggle('is-active',active===kind);box.classList.toggle('is-proposal',kind==='label'&&!state.isLabelEnabled());
      box.setAttribute('aria-label',kind==='gauge'?'Area gauge. Seret untuk memindahkan.':'Area label nama alat. Seret untuk memindahkan.');
      for(const handle of box.querySelectorAll('[data-roi-handle]'))handle.tabIndex=active===kind?0:-1;
    }
    for(const button of root.querySelectorAll('[data-roi-tool]'))button.setAttribute('aria-pressed',String(button.dataset.roiTool===active));
    for(const button of root.querySelectorAll('[data-roi-drag]'))button.setAttribute('aria-pressed',String(button.dataset.roiDrag===dragMode));
    root.querySelector('[data-roi-active-name]').textContent=active==='gauge'?'Area gauge':'Area label';
    root.querySelector('[data-roi-zoom-value]').textContent=zoom.toFixed(1)+'×';
    root.querySelector('[data-roi-zoom="out"]').disabled=zoom<=1;
    root.querySelector('[data-roi-zoom="in"]').disabled=zoom>=4;
    root.querySelector('[data-roi-status]').textContent=state.isLabelEnabled()?'Hijau: gauge · Kuning: label nama alat. Kedua area diatur terpisah.':'Label belum ditemukan. Pilih “Label” untuk memakai kotak kuning di bawah gauge.';
    root.querySelector('[data-roi-drag-help]').textContent=dragMode==='photo'?(zoom>1?'Seret foto di mana saja, termasuk di atas kotak. Area crop tetap sama.':'Tekan “＋ Foto” untuk memperbesar, lalu seret foto. Area crop tetap sama.'):'Seret tengah kotak untuk memindahkan. Tarik bulatan sudut untuk mengubah ukuran. Untuk menggeser foto yang diperbesar, pilih “Geser foto”.';
    stage.classList.toggle('is-zoomed',zoom>1);
    stage.classList.toggle('is-photo-mode',dragMode==='photo');
  }
  function select(kind,enableLabel=false){active=kind;if(kind==='label'&&enableLabel)state.setLabelEnabled(true);render();}
  function localPoint(event){const bounds=stage.getBoundingClientRect();return {x:event.clientX-bounds.left,y:event.clientY-bounds.top};}
  function pointerDown(event){
    if((event.button!==undefined&&event.button!==0)||drag||!transform)return;
    const box=event.target.closest('[data-roi-box]'),handle=event.target.closest('[data-roi-handle]');
    const intent=pointerDragIntent({mode:dragMode,overBox:!!box,zoom});
    if(!intent)return;
    if(intent==='roi')select(box.dataset.roiBox);
    event.preventDefault();
    const point=localPoint(event);
    drag={id:event.pointerId,start:point,imageStart:viewportToImage(point,transform),roi:currentRoi(),region:active,kind:intent,corner:handle?.dataset.roiHandle,panX,panY,transform:{...transform},moved:false};
    stage.setPointerCapture(event.pointerId);stage.classList.add('is-dragging');
  }
  function pointerMove(event){
    if(!drag||event.pointerId!==drag.id)return;
    const point=localPoint(event),dx=point.x-drag.start.x,dy=point.y-drag.start.y;
    // A tap only selects a box; it never invalidates an existing analysis.
    if(!drag.moved&&Math.hypot(dx,dy)<3)return;
    drag.moved=true;event.preventDefault();
    if(drag.kind==='pan'){panX=drag.panX+dx;panY=drag.panY+dy;render();return;}
    const mapped=viewportToImage(point,drag.transform),delta={x:mapped.x-drag.imageStart.x,y:mapped.y-drag.imageStart.y};
    state.update(drag.region,drag.corner?resizeRoi(drag.roi,drag.corner,delta):moveRoi(drag.roi,delta));
  }
  function pointerEnd(event){if(!drag||event.pointerId!==drag.id)return;drag=null;stage.classList.remove('is-dragging');if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);}
  listen(stage,'pointerdown',pointerDown);listen(stage,'pointermove',pointerMove);
  for(const event of ['pointerup','pointercancel','lostpointercapture'])listen(stage,event,pointerEnd);
  listen(root,'click',event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.dataset.roiDrag){dragMode=button.dataset.roiDrag;render();return;}
    if(button.dataset.roiTool){select(button.dataset.roiTool,true);return;}
    if(button.dataset.roiNudge){
      const deltas={left:{x:-.01,y:0},right:{x:.01,y:0},up:{x:0,y:-.01},down:{x:0,y:.01}};
      state.update(active,moveRoi(currentRoi(),deltas[button.dataset.roiNudge]));return;
    }
    if(button.dataset.roiSize){state.update(active,scaleRoi(currentRoi(),button.dataset.roiSize==='in'?.9:1.1));return;}
    if(button.dataset.roiZoom){
      if(button.dataset.roiZoom==='reset'){zoom=1;panX=panY=0;}
      else zoom=Math.min(4,Math.max(1,zoom+(button.dataset.roiZoom==='in'?.5:-.5)));
      render();
    }
  });
  listen(stage,'keydown',event=>{
    if(!event.target.closest('[data-roi-box]'))return;
    const deltas={ArrowLeft:{x:-.01,y:0},ArrowRight:{x:.01,y:0},ArrowUp:{x:0,y:-.01},ArrowDown:{x:0,y:.01}};
    if(!deltas[event.key])return;event.preventDefault();
    if(dragMode==='photo'){
      panX+=event.key==='ArrowRight'?20:event.key==='ArrowLeft'?-20:0;
      panY+=event.key==='ArrowDown'?20:event.key==='ArrowUp'?-20:0;
      render();return;
    }
    select(event.target.closest('[data-roi-box]').dataset.roiBox);
    const handle=event.target.closest('[data-roi-handle]');
    state.update(active,handle?resizeRoi(currentRoi(),handle.dataset.roiHandle,deltas[event.key]):moveRoi(currentRoi(),deltas[event.key]));
  });
  for(const prefix of ['roi','label'])for(const key of fields)listen(byId(prefix+'-'+key),'change',()=>{
    if(fields.some(name=>byId(prefix+'-'+name).value===''))return;
    state.update(prefix==='roi'?'gauge':'label',read(prefix));writeInputs();render();
  });
  listen(byId('label-enabled'),'change',()=>{state.setLabelEnabled(byId('label-enabled').checked);render();});
  listen(image,'load',render);
  const observer=new ResizeObserver(render);observer.observe(stage);
  writeInputs();render();
  return {
    setImage(url){drag=null;dragMode='box';zoom=1;panX=panY=0;image.src=url;render();},
    setRegions(regions){state.setRegions(regions);active='gauge';writeInputs();render();},
    syncFromInputs(){
      const before=state.getRegions(),next={roi:clampRoi(read('roi')),label_roi:byId('label-enabled').checked?clampRoi(read('label')):null};
      const same=(a,b)=>!!a===!!b&&(!a||fields.every(key=>Math.abs(a[key]-b[key])<1e-7));
      if(same(before.roi,next.roi)&&same(before.label_roi,next.label_roi)){render();return;}
      state.setRegions(next);writeInputs();render();onChange(state.getRegions());
    },
    getRegions:state.getRegions,
    refresh:render,
    destroy(){observer.disconnect();listeners.forEach(remove=>remove());},
  };
}
