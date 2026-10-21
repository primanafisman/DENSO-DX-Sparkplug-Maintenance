import {useEffect,useRef,useState} from 'react';
import {createCameraSession} from '../model/camera';
export function useCamera(){const videoRef=useRef<HTMLVideoElement>(null),session=useRef<ReturnType<typeof createCameraSession>|null>(null);const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('Hadapkan kamera tegak lurus. Seluruh gauge dan label harus terlihat.'),[error,setError]=useState<unknown>(null);
  const close=()=>{session.current?.close();setOpen(false);setBusy(false);};
  const start=async()=>{setError(null);if(!navigator.mediaDevices?.getUserMedia){setError(new Error('Pratinjau kamera membutuhkan HTTPS dan izin kamera. Gunakan Kamera bawaan atau Upload sebagai cadangan.'));return;}setOpen(true);setBusy(true);try{await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));session.current??=createCameraSession();if(!videoRef.current)throw new Error('Pratinjau kamera belum siap.');await session.current.open(videoRef.current);}catch(e){setError(e);close();}finally{setBusy(false);}};
  const take=async(monitor=false)=>{if(!session.current)return null;setBusy(true);try{const result=await session.current.take(monitor,setMessage);close();return result.file;}catch(e){setError(e);return null;}finally{setBusy(false);}};
  useEffect(()=>()=>session.current?.close(),[]);return {videoRef,open,busy,message,error,start,take,close,clearError:()=>setError(null)};
}
