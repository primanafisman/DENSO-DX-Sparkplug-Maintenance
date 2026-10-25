import { expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressRing } from './ProgressRing';

it('shows completion from actual ready counts and never substitutes monthly totals', () => {
  render(<ProgressRing completed={2} pending={3} ready />);
  expect(screen.getByRole('img', { name: 'Progres pemeriksaan 40%' })).toBeVisible();
  expect(screen.getByText('40%')).toBeVisible();
});
it('keeps unavailable and empty obligations honest', () => {
  const view = render(<ProgressRing completed={10} pending={0} ready={false} />);
  expect(screen.getByRole('img', { name: 'Progres pemeriksaan belum tersedia' })).toBeVisible();
  expect(screen.queryByText('100%')).not.toBeInTheDocument();
  view.rerender(<ProgressRing completed={0} pending={0} ready />);
  expect(screen.getByText('—')).toBeVisible();
});
