import { it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server';
import { renderApp } from '../../test/render';
import { envelope } from '../../test/fixtures';
import { useCapabilities } from './useCapabilities';

function Probe() {
  const q = useCapabilities();
  return (
    <output>
      {q.data?.demo_reports === true
        ? 'Demo tersedia'
        : q.isPending
          ? 'Memeriksa'
          : 'Demo tidak tersedia'}
    </output>
  );
}
it.each([true, false, undefined])(
  'requires an explicit true capability to offer demo reports (%s)',
  async (demo_reports) => {
    server.use(
      http.get('/api/v1/capabilities', () => HttpResponse.json(envelope({ demo_reports }))),
    );
    renderApp(<Probe />);
    expect(
      await screen.findByText(demo_reports === true ? 'Demo tersedia' : 'Demo tidak tersedia'),
    ).toBeVisible();
  },
);
