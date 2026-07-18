import { turb } from 'turbulencejs';
import surface from 'turbulencejs/surfaces';
import { createTurbulenceRecipes } from '../recipes/effects';

const turbulence = createTurbulenceRecipes(turb, surface);

export const { snaporate, enhance, sidebarReady, tetrisLoad } = turbulence;
export default turbulence;
