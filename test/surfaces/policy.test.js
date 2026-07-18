import { applySurfacePolicy, createSurfacePolicy } from '../../src/surfaces/policy';
import { SurfaceError } from '../../src/surfaces/errors';

describe('surface resource policy', () => {
  test('validates finite caps and reports deterministic degradation', () => {
    expect(() => createSurfacePolicy({ maxParticles: Number.POSITIVE_INFINITY })).toThrow(SurfaceError);
    const result = applySurfacePolicy({ width: 200, height: 100, dpr: 3, particles: 500 }, {
      maxDpr: 1,
      maxParticles: 100
    });
    expect(result.applied).toMatchObject({ rasterWidth: 200, rasterHeight: 100, dpr: 1, particles: 100 });
    expect(result.degradations).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'dpr', applied: 1 }),
      expect.objectContaining({ field: 'particles', applied: 100 })
    ]));
  });

  test('can reject instead of degrading and bounds allocation', () => {
    expect(() => applySurfacePolicy({ width: 1000, height: 1000, dpr: 2 }, {
      maxAllocationBytes: 1000,
      mode: 'reject'
    })).toThrow(expect.objectContaining({ code: 'SURFACE_POLICY_REJECTED' }));
  });
});
