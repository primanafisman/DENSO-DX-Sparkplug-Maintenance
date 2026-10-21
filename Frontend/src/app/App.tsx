import {Suspense} from 'react';
import {Loading} from '../shared/components/ui';
import {RouterProvider} from 'react-router-dom';
import {router} from './router';
import {Providers} from './providers';
export function App(){return <Providers><Suspense fallback={<Loading/>}><RouterProvider router={router}/></Suspense></Providers>;}

