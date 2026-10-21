import { it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderApp } from '../../../test/render';
import { InspectionContextForm } from './InspectionContextForm';
it('empty configured lines and samplers disable selection instead of offering unrestricted text input', () => {
  renderApp(
    <InspectionContextForm
      settings={{ lines: [], allowed_samplers: [], night_rollover_hour: 12 }}
      value={{ line: '', sampler: '' }}
      onChange={() => {}}
    />,
  );
  expect(screen.getByLabelText('Line')).toBeDisabled();
  expect(screen.getByLabelText('Sampler')).toBeDisabled();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});
