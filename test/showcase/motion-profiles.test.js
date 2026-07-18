import { turb, script } from '../../src/turbscript';
import { createCartoonRecipes } from '../../src/recipes/cartoon';
import { createCinematicRecipes } from '../../src/recipes/cinematic';
import {
  createMotionRunner,
  intensityNames,
  isReducedMotion,
  motionProfiles,
  parseMotionQuery,
  profileNames
} from '../../examples/showcase/src/motion-profiles';

const packs = {
  cartoon: createCartoonRecipes(turb),
  cinematic: createCinematicRecipes(turb)
};

function runnerApi() {
  return { turb, script: jest.fn(recipe => script(recipe)) };
}

describe('showcase motion profiles', () => {
  test('registry exposes ten TurbScript profiles and three intensity levels', () => {
    expect(Object.keys(motionProfiles)).toEqual(profileNames);
    expect(profileNames).toEqual([
      'quiet', 'waterfall', 'sproing', 'slam', 'glitch', 'zeroGravity',
      'bubbleIn', 'skedaddle', 'card3D', 'cinematicSlide'
    ]);
    expect(intensityNames).toEqual(['restrained', 'expressive', 'wild']);
    Object.values(motionProfiles).forEach(profile => {
      expect(typeof profile.program).toBe('function');
      expect(profile.code).toContain('turb.');
    });
  });

  test('query parsing accepts known settings and safely falls back', () => {
    expect(parseMotionQuery('?motion=card3D&intensity=wild')).toEqual({ profile: 'card3D', intensity: 'wild' });
    expect(parseMotionQuery('?motion=unknown&intensity=maximum')).toEqual({ profile: 'quiet', intensity: 'expressive' });
  });

  test('runner replaces one owned performance, restores styles, seeds playback, and syncs the URL', () => {
    document.body.innerHTML = '<div data-motion-item style="transform: rotate(2deg)"></div><div data-motion-item></div>';
    const api = runnerApi();
    const location = { href: 'https://example.test/?motion=waterfall&intensity=restrained', search: '?motion=waterfall&intensity=restrained' };
    const history = { replaceState: jest.fn((_state, _title, url) => { location.href = String(url); }) };
    const runner = createMotionRunner(api, { root: document, packs, location, history, dispatchTarget: document });

    const [first] = runner.run();
    runner.setProfile('sproing');

    expect(first.state).toBe('idle');
    expect(document.querySelector('[data-motion-item]').style.transform).toContain('rotate(2deg)');
    expect(location.href).toContain('motion=sproing');
    expect(api.script).toHaveBeenCalledTimes(2);
    expect(runner.getState()).toMatchObject({
      profile: 'sproing', intensity: 'restrained', activeControllers: 1,
      seed: 'turbshire:sproing:restrained'
    });
  });

  test('all profiles compile through the public script runtime', () => {
    document.body.innerHTML = '<div data-motion-item></div><div data-motion-item></div>';
    const api = runnerApi();
    const runner = createMotionRunner(api, {
      root: document, packs,
      location: { href: 'https://example.test/', search: '' },
      history: { replaceState() {} }, dispatchTarget: document
    });
    profileNames.forEach(profile => runner.setProfile(profile));
    expect(api.script).toHaveBeenCalledTimes(profileNames.length);
    runner.restore();
    expect(runner.getState().activeControllers).toBe(0);
  });

  test('runner normalizes unknown runtime values and can reset', () => {
    document.body.innerHTML = '<div data-motion-item></div>';
    const runner = createMotionRunner(runnerApi(), {
      root: document, packs,
      location: { href: 'https://example.test/', search: '' },
      history: { replaceState() {} }, dispatchTarget: document
    });

    expect(runner.setProfile('not-real', { replay: false }).profile).toBe('quiet');
    expect(runner.setIntensity('too-much', { replay: false }).intensity).toBe('expressive');
    runner.setProfile('glitch', { replay: false });
    runner.reset();
    expect(runner.getState()).toMatchObject({ profile: 'quiet', intensity: 'expressive' });
  });

  test('reduced-motion detection follows the supplied media query', () => {
    expect(isReducedMotion(() => ({ matches: true }))).toBe(true);
    expect(isReducedMotion(() => ({ matches: false }))).toBe(false);
    expect(isReducedMotion(undefined)).toBe(false);
  });

  test('lab reduced-motion override compiles every phase to an instant endpoint', async () => {
    document.documentElement.dataset.reducedMotion = 'true';
    document.body.innerHTML = '<div data-motion-item></div>';
    const runner = createMotionRunner(runnerApi(), {
      root: document, packs,
      location: { href: 'https://example.test/?motion=skedaddle&reduced=1', search: '?motion=skedaddle&reduced=1' },
      history: { replaceState() {} }, dispatchTarget: document
    });
    const [performance] = runner.run();
    expect(performance.duration).toBe(0);
    await Promise.resolve();
    expect(performance.state).toBe('completed');
    expect(pendingAnimationFrames()).toBe(0);
    delete document.documentElement.dataset.reducedMotion;
  });
});
