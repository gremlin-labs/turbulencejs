import { motionOptions, motionRoles } from '../../src/core/motion';

describe('semantic motion roles', () => {
  test('defines a reduced-motion alternative for every role', () => {
    Object.values(motionRoles).forEach(role => expect(role.reducedMotion).toBe('instant'));
  });

  test('allows deliberate overrides without mutating the recipe', () => {
    expect(motionOptions('feedbackFast', { duration: 200 })).toMatchObject({ role: 'feedbackFast', duration: 200, easing: 'quadOut' });
    expect(motionRoles.feedbackFast.duration).toBe(160);
  });
});
