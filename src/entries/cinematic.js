import { turb } from 'turbulencejs';
import { createCinematicRecipes } from '../recipes/cinematic';

const cinematic = createCinematicRecipes(turb);

export const { card3D, cinematicSlide } = cinematic;
export default cinematic;
