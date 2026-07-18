import { turb } from 'turbulencejs';
import cartoon from 'turbulencejs/cartoon';
import cinematic from 'turbulencejs/cinematic';
import { createExtremeRecipes } from '../recipes/extreme';

const extreme = createExtremeRecipes(turb, cartoon, cinematic);

export const { impactBubble, panicSkedaddle, spinAway } = extreme;
export default extreme;
