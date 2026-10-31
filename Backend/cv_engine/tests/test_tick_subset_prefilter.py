"""Reject angular clutter in bounded batches without changing tick selection."""
import math
from itertools import combinations

import numpy as np
import pytest

from src.vision import hybrid_auto_analog


def tick(angle, width=2.):
    return {'angle': float(angle), 'width': width, 'strength': .8, 'long_trace': .1}


@pytest.mark.parametrize('supported', [False, True])
def test_six_tick_search_has_bounded_scalar_work_with_sixteen_candidates(monkeypatch, supported):
    if supported:
        ticks = [tick((135+54*i) % 360, 3.) for i in range(6)]
        ticks.extend(tick((153+54*i) % 360, .5) for i in range(5))
        ticks.extend(tick(angle, 1.) for angle in [8,30,61,80,104,163,215,276,318,335])
    else:
        ticks = [tick(angle) for angle in sorted(np.random.default_rng(30).uniform(0,360,16))]
    original_unwrap = np.unwrap
    calls = 0
    def counted_unwrap(*args, **kwargs):
        nonlocal calls
        calls += 1
        return original_unwrap(*args, **kwargs)
    monkeypatch.setattr(np, 'unwrap', counted_unwrap)
    selected, info = hybrid_auto_analog.select_six_ticks(ticks)
    if supported:
        assert [t['angle'] for t in selected] == [135,189,243,297,351,45]
        assert all(t is ticks[index] for index,t in enumerate(selected))
        assert info['sweep_degrees'] == 270
    else:
        assert selected is None
        assert info == {}
    # One batched unwrap plus the few possible scalar candidates is enough;
    # enumerating all 8,008 combinations individually causes multi-minute crops.
    assert calls <= 32


def scalar_angular_indices(pool):
    """Frozen scalar angular gate, independent of the new batched prefilter."""
    accepted = []
    for row in combinations(range(len(pool)), 6):
        chosen = tuple(pool[index] for index in row)
        gaps = np.diff([t['angle'] for t in chosen]+[chosen[0]['angle']+360])
        gap_index = int(gaps.argmax())
        ordered = list(chosen[gap_index+1:])+list(chosen[:gap_index+1])
        angles = np.unwrap(np.deg2rad([t['angle'] for t in ordered]))*180/math.pi
        intervals = np.diff(angles)
        with np.errstate(divide='ignore', invalid='ignore'):
            if (35 < np.median(intervals) < 61 and intervals.max()/intervals.min() < 1.30
                    and gaps[gap_index] > intervals.max()*1.35):
                accepted.append(row)
    return np.asarray(accepted, dtype=np.int16).reshape(-1,6)


def boundary_pools():
    pools = []
    for ratio in [np.nextafter(1.30,0.),1.30,np.nextafter(1.30,np.inf)]:
        pools.append([0.,45.,90.,135.,180.,180.+45.*ratio])
    step = 360/(5+1.35)
    end = 5*step
    for endpoint in [np.nextafter(end,0.),end,np.nextafter(end,360.)]:
        pools.append([0.,step,2*step,3*step,4*step,endpoint])
    pools.append([0.,35.,61.,90.,np.nextafter(180.,0.),180.,np.nextafter(180.,360.),215.,241.,270.,np.nextafter(360.,0.),359.,359.5,12.,145.,305.])
    pools.append([i*22.5 for i in range(16)])
    pools.append([180.]*16)
    return [[tick(angle) for angle in sorted(angles)] for angles in pools]


@pytest.mark.parametrize('pool', boundary_pools())
def test_batched_angular_gate_preserves_boundary_combinations_and_order(pool):
    actual = hybrid_auto_analog._six_tick_candidate_indices(pool)
    assert np.array_equal(actual, scalar_angular_indices(pool))
