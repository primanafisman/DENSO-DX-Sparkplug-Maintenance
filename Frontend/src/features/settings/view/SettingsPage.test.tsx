import {it,expect,vi} from 'vitest';
import {http,HttpResponse} from 'msw';
import {screen,fireEvent,waitFor} from '@testing-library/react';
import {server} from '../../../test/server';
import {renderApp} from '../../../test/render';
import {envelope,fixtureDefinition} from '../../../test/fixtures';
import {SettingsPage} from './SettingsPage';
import {DefinitionEditor} from './DefinitionEditor';
it('settings preserve structured source guidance and require a revision reason',async()=>{
  server.use(http.get('/api/v1/auth/me',()=>HttpResponse.json(envelope({id:'a',username:'Admin',role:'Admin'}))),http.get('/api/v1/maintenance/settings',()=>HttpResponse.json(envelope({lines:['17'],allowed_samplers:['Ldr'],night_rollover_hour:12,product_types:[]}))),http.get('/api/v1/maintenance/catalog',()=>HttpResponse.json(envelope({items:[fixtureDefinition({review_notes:['Periksa jadwal dari sumber']})],count:1,source_gaps:{missing_rows:[17],clipped_row:45}}))));
  renderApp(<SettingsPage/>);expect(await screen.findByText('Periksa jadwal dari sumber')).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'Edit EE Cutting'}));expect(screen.getByLabelText('Alasan revisi')).toBeRequired();expect(screen.getByDisplayValue('1 kali per shift')).toBeVisible();
});
it('weekly edit sends explicit weekdays and retains original paper time guidance',async()=>{
  const d=fixtureDefinition({intervals:['weekly']});d.interval_guide.day.times=[{time:'09:45',day_offset:0}];const save=vi.fn();
  renderApp(<DefinitionEditor definition={d} onClose={()=>{}} onSave={save} saving={false} error={null}/>);
  fireEvent.click(screen.getByText('Waktu pemeriksaan dan sumber'));fireEvent.click(screen.getByLabelText('Shift 1 · 07:45'));fireEvent.click(screen.getByLabelText('Sen'));fireEvent.change(screen.getByLabelText('Alasan revisi'),{target:{value:'Metode direvisi'}});fireEvent.click(screen.getByRole('button',{name:'Simpan revisi'}));
  await waitFor(()=>expect(save).toHaveBeenCalled());const body=save.mock.calls[0][0];expect(body.occurrence_rule).toEqual({slot_ids:['day-0745'],weekdays:[1]});expect(body.interval_guide.day.times).toEqual([{time:'09:45',day_offset:0}]);expect(body.review_reason).toBe('Metode direvisi');
});
