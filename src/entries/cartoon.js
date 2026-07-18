import { turb } from 'turbulencejs';
import { createCartoonRecipes } from '../recipes/cartoon';

const cartoon = createCartoonRecipes(turb);

export const { bubbleIn, bubbleInParts, skedaddle } = cartoon;
export default cartoon;
