import type {ReactNode} from 'react';
import {render} from '@testing-library/react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {MemoryRouter} from 'react-router-dom';
export function renderApp(ui:ReactNode,route='/'){const client=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});return {...render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter></QueryClientProvider>),client};}
