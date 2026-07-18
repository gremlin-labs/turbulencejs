import { turb } from 'turbulencejs';
import cartoon from 'turbulencejs/cartoon';
import cinematic from 'turbulencejs/cinematic';
import { createSubtleRecipes } from '../recipes/subtle';

const subtle = createSubtleRecipes(turb, cartoon, cinematic);

export const { softReveal, quietSlide, gentleSettle } = subtle;
export default subtle;
