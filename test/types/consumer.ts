import turbulencejs, { animate, direct, easing, turb, motion, path, script, spring, timeline } from 'turbulencejs';
import cartoon, { bubbleIn, skedaddle } from 'turbulencejs/cartoon';
import cinematic, { card3D, cinematicSlide } from 'turbulencejs/cinematic';
import subtle, { gentleSettle } from 'turbulencejs/subtle';
import extreme, { spinAway } from 'turbulencejs/extreme';
import surface, { dissolve, source as surfaceSource } from 'turbulencejs/surfaces';
import turbulence, { enhance, sidebarReady, snaporate, tetrisLoad } from 'turbulencejs/effects';
import interact, { drag, hover } from 'turbulencejs/interact';

declare const element: HTMLElement;

const controller = animate(element, { opacity: [0, 1], x: [10, 0] }, {
  easing: easing.createEasing('easeOutElastic(1, 0.7)'),
  onComplete: completedElement => completedElement.focus()
});
controller.pause();
controller.resume();
controller.reverse();

timeline.create().add(controller, '+=20').play();
spring.to(element, 'x', 100, spring.bouncy()).retarget(40);
path.follow(element, path.create([{ x: 0, y: 0 }, { x: 20, y: 10 }]), { rotate: true });
turbulencejs.buttons.click(element, motion.options('feedbackFast'));

const reveal = turb.sequence(
  turb.track({ opacity: [0, 1] }, { role: 'stateEnter' }),
  turb.track({ scale: [0.9, 1] })
);
script(reveal).play(element).replay().finish();
direct(element).stagger(20).using(reveal).seed('typed').play();
script(turb.sequence(
  cartoon.bubbleIn(), bubbleIn({ from: 'left' }), skedaddle.out({ to: 'right' }),
  cinematic.card3D.in({ from: 'northEast' }), card3D.out(), cinematicSlide.in({ content: 'after' }),
  subtle.softReveal(), gentleSettle(), extreme.impactBubble(), spinAway()
)).play(element);

declare const imageData: ImageData;
script(dissolve.out(surfaceSource.imageData(imageData), { duration: 400, maxParticles: 1000 })).play(element);
void surface;
script(snaporate.out(surfaceSource.imageData(imageData), { fidelity: 'pixel', direction: 'up-right' })).play(element);
script(enhance(['/preview-8.jpg', '/preview-64.jpg', '/final.jpg'], { content: 'replace-at-mark' })).play(element);
void turbulence;
script(sidebarReady({ finish: 'mixed', parentSlot: 'parent' })).play(element);
script(tetrisLoad({ direction: 'down', win: 'flash-reveal', groupSlot: 'group', contentSlot: 'content' })).play(element);
const hoverSession = hover(element, { enter: reveal, leave: turb.track({ scale: [1.03, 1] }), interruption: 'reverse' });
hoverSession.suspend().resume().destroy();
void interact;
const dragSession = drag(element, {
  axis: 'y', grid: 8, dropZones: '.drop-zone',
  canDrop: ({ zone }) => Boolean(zone),
  onDrop: ({ target }) => target.setAttribute('data-committed-by-host', 'true'),
  announce: ({ messageKey }) => void messageKey
});
dragSession.cancel().destroy();
