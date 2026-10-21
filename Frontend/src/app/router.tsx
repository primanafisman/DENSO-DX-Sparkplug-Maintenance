import {createBrowserRouter,Navigate,Outlet} from 'react-router-dom';
import type {Role} from '../shared/lib/contracts';
import {useSession} from '../features/auth/controller/useSession';
import {LoginPage} from '../features/auth/view/LoginPage';
import {AppShell} from '../shared/components/layout/AppShell';
import {PageHeader} from '../shared/components/layout/PageHeader';
import {Loading,Empty} from '../shared/components/ui';
export function RequireRole({roles}:{roles?:Role[]}){const session=useSession();if(session.status==='loading')return <Loading/>;if(!session.user)return <Navigate to="/login" replace/>;if(roles&&!roles.includes(session.user.role))return <Empty title="Akses terbatas" description="Akun Anda tidak memiliki izin untuk tindakan ini."/>;return <Outlet/>;}
const pending=(title:string)=><><PageHeader title={title}/><Empty title="Halaman sedang diintegrasikan" description="Data akan tampil setelah integrasi halaman ini selesai."/></>;
export const router=createBrowserRouter([{path:'/login',element:<LoginPage/>},{element:<RequireRole/>,children:[{element:<AppShell/>,children:[{index:true,element:pending('Ringkasan bulanan')},{path:'pemeriksaan',element:pending('Pemeriksaan')},{path:'riwayat',element:pending('Riwayat')},{path:'peralatan',element:pending('Peralatan')},{path:'pengaturan',element:pending('Pengaturan')}]}]},{path:'*',element:<Empty title="Halaman tidak ditemukan" description="Gunakan menu utama untuk kembali."/>}]);
