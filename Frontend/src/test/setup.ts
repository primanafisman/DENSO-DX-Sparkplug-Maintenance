import '@testing-library/jest-dom/vitest';
import {afterEach,afterAll,beforeAll} from 'vitest';
import {cleanup} from '@testing-library/react';
import {server} from './server';
import {resetCsrf} from '../shared/lib/csrf';
beforeAll(()=>server.listen({onUnhandledRequest:'error'}));
afterEach(()=>{cleanup();server.resetHandlers();localStorage.clear();resetCsrf();});
afterAll(()=>server.close());
globalThis.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};
