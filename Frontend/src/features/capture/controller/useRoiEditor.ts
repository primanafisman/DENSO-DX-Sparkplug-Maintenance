import {useState} from 'react';
import type {ROI} from '../../../shared/lib/contracts';
import {clampRoi,moveRoi,resizeRoi} from '../model/roiGeometry';
export function useRoiEditor(initial:ROI,minimum={width:.02,height:.02}){const [roi,setRoi]=useState(initial),[zoom,setZoom]=useState(1),[pan,setPan]=useState({x:0,y:0}),[mode,setMode]=useState<'box'|'photo'>('box');return {roi,zoom,pan,mode,setMode,setPan,setZoom:(v:number)=>setZoom(Math.min(4,Math.max(1,v))),setRoi:(r:ROI)=>setRoi(clampRoi({...r,width:Math.max(minimum.width,r.width),height:Math.max(minimum.height,r.height)})),nudge:(x:number,y:number)=>setRoi(r=>moveRoi(r,{x,y})),resize:(x:number,y:number)=>setRoi(r=>resizeRoi(r,{x,y}))};}
