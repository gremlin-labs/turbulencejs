import { takeAnimationDefinition } from './engine';
import { playbackUnitDuration, propertyPlaybackUnit, validatePlaybackUnit } from './units';

function resolveOffset(offset, duration) {
  if (typeof offset === 'number') return Math.max(0, offset);
  const relative = typeof offset === 'string' && offset.match(/^([+-])=(\d*\.?\d+)$/);
  if (!relative) return duration;
  const value = Number(relative[2]);
  return Math.max(0, relative[1] === '+' ? duration + value : duration - value);
}

function entryProgress(entry, time) {
  const elapsed = time - entry.offset - entry.unit.config.delay;
  if (elapsed < 0) return 0;
  if (entry.unit.config.duration === 0) return entry.unit.config.yoyo && entry.unit.config.repeat % 2 === 1 ? 0 : 1;
  if (elapsed === 0) return 0;
  const iterations = entry.unit.config.repeat === -1 ? 1 : entry.unit.config.repeat + 1;
  const complete = elapsed >= entry.unit.config.duration * iterations;
  const iteration = complete ? iterations - 1 : Math.floor(elapsed / entry.unit.config.duration);
  const progress = complete ? 1 : (elapsed % entry.unit.config.duration) / entry.unit.config.duration;
  return entry.unit.config.yoyo && iteration % 2 === 1 ? 1 - progress : progress;
}

class Timeline {
  constructor(options = {}) {
    this.animations = [];
    this.marks = [];
    this.currentTime = 0;
    this.duration = 0;
    this.timeScale = Math.max(0.001, Number(options.timeScale) || 1);
    this.loop = options.loop === true;
    this.yoyo = options.yoyo === true;
    this.respectReducedMotion = options.respectReducedMotion !== false;
    this.reducedMotion = typeof options.reducedMotion === 'boolean' ? options.reducedMotion : null;
    this.direction = 1;
    this.isPlaying = false;
    this.isComplete = false;
    this.requestId = null;
    this.anchorTime = 0;
    this.anchorTimestamp = 0;
    this.onUpdateCallback = options.onUpdate || null;
    this.onCompleteCallback = options.onComplete || null;
    this.onMarkCallback = options.onMark || null;
    this.onErrorCallback = options.onError || null;
    this.completionCalled = false;
  }

  add(controller, offset = '+=0') {
    const definition = takeAnimationDefinition(controller);
    if (!definition) {
      console.warn('Timeline.add requires an animation controller returned by animate().');
      return this;
    }
    return this.addUnit(propertyPlaybackUnit(definition), offset);
  }

  addUnit(candidate, offset = '+=0') {
    const unit = validatePlaybackUnit(candidate);
    const absoluteOffset = resolveOffset(offset, this.duration);
    const duration = playbackUnitDuration(unit);
    this.animations.push({
      unit,
      offset: absoluteOffset,
      endTime: absoluteOffset + duration,
      startCalled: false,
      completeCalled: false,
      cancelCalled: false
    });
    this.duration = Math.max(this.duration, absoluteOffset + duration);
    return this;
  }

  addMark(mark, offset = '+=0') {
    if (!mark?.name || typeof mark.name !== 'string') throw new TypeError('Timeline mark requires a name.');
    const absoluteOffset = resolveOffset(offset, this.duration);
    this.marks.push({ name: mark.name, metadata: mark.metadata, offset: absoluteOffset, emitted: false });
    this.marks.sort((left, right) => left.offset - right.offset);
    this.duration = Math.max(this.duration, absoluteOffset);
    return this;
  }

  ensureDuration(duration) {
    const value = Number(duration);
    if (!Number.isFinite(value) || value < 0) throw new RangeError('Timeline duration must be a finite non-negative number.');
    this.duration = Math.max(this.duration, value);
    return this;
  }

  play() {
    if (this.isPlaying) return this;
    if (this.isComplete) {
      this.currentTime = this.direction === 1 ? 0 : this.duration;
      this.isComplete = false;
      this.completionCalled = false;
      this.animations.forEach(entry => {
        entry.startCalled = false;
        entry.completeCalled = false;
        entry.cancelCalled = false;
      });
      this.marks.forEach(mark => { mark.emitted = false; });
    }
    this.isPlaying = true;
    const reduce = this.respectReducedMotion && (this.reducedMotion ?? (
      typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ));
    if (reduce || this.duration === 0) {
      this.currentTime = this.direction === 1 ? this.duration : 0;
      this.renderAt(this.currentTime, true, this.direction === 1 ? 0 : this.duration);
      queueMicrotask(() => {
        if (!this.isPlaying) return;
        this.isPlaying = false;
        this.isComplete = true;
        if (!this.completionCalled && typeof this.onCompleteCallback === 'function') {
          this.completionCalled = true;
          this.onCompleteCallback();
        }
      });
      return this;
    }
    this.anchorTime = this.currentTime;
    this.anchorTimestamp = performance.now();
    this.schedule();
    return this;
  }

  pause() {
    if (!this.isPlaying) return this;
    this.isPlaying = false;
    if (this.requestId !== null) cancelAnimationFrame(this.requestId);
    this.requestId = null;
    return this;
  }

  resume() { return this.play(); }

  stop() {
    return this.cancel({ reset: true });
  }

  cancel({ reset = false } = {}) {
    for (const entry of this.animations) {
      if (!entry.completeCalled && !entry.cancelCalled && entry.unit.cancel) {
        entry.cancelCalled = true;
        entry.unit.cancel(this.lifecycleContext(entry, this.currentTime, this.currentTime));
      }
    }
    this.pause();
    this.isComplete = false;
    this.completionCalled = false;
    this.direction = 1;
    if (reset) this.seek(0);
    return this;
  }

  finish() {
    if (this.isComplete) return this;
    this.pause();
    this.direction = 1;
    const previousTime = this.currentTime;
    this.currentTime = this.duration;
    for (const entry of this.animations) {
      const progress = entry.unit.easing(entryProgress(entry, this.duration));
      entry.unit.render(progress, this.lifecycleContext(entry, this.duration, previousTime));
      if (!entry.startCalled) {
        entry.startCalled = true;
        entry.unit.start?.(this.lifecycleContext(entry, this.duration, previousTime));
      }
      if (!entry.completeCalled) {
        entry.completeCalled = true;
        entry.unit.config.onUpdate?.(entry.unit.element, progress, 0);
        entry.unit.complete?.(this.lifecycleContext(entry, this.duration, previousTime));
      }
    }
    this.emitMarks(this.duration, previousTime, true);
    this.isComplete = true;
    if (!this.completionCalled && typeof this.onCompleteCallback === 'function') {
      this.completionCalled = true;
      this.onCompleteCallback();
    }
    return this;
  }

  reverse() {
    if (!this.isPlaying && !this.isComplete && this.currentTime === 0) this.currentTime = this.duration;
    this.direction *= -1;
    this.anchorTime = this.currentTime;
    this.anchorTimestamp = performance.now();
    if (!this.isPlaying) this.play();
    return this;
  }

  seek(time, { emitMarks = false } = {}) {
    const previousTime = this.currentTime;
    this.currentTime = Math.max(0, Math.min(Number(time) || 0, this.duration));
    this.anchorTime = this.currentTime;
    this.anchorTimestamp = performance.now();
    this.renderAt(this.currentTime);
    if (emitMarks) this.emitMarks(this.currentTime, previousTime, true);
    return this;
  }

  setTimeScale(scale) {
    this.anchorTime = this.currentTime;
    this.anchorTimestamp = performance.now();
    this.timeScale = Math.max(0.001, Number(scale) || 0.001);
    return this;
  }

  onComplete(callback) { this.onCompleteCallback = callback; return this; }
  onUpdate(callback) { this.onUpdateCallback = callback; return this; }
  onMark(callback) { this.onMarkCallback = callback; return this; }

  schedule() {
    if (this.requestId === null && this.isPlaying) {
      this.requestId = requestAnimationFrame(timestamp => this.tick(timestamp));
    }
  }

  tick(timestamp) {
    this.requestId = null;
    if (!this.isPlaying) return;
    const elapsed = (timestamp - this.anchorTimestamp) * this.timeScale * this.direction;
    const nextTime = this.anchorTime + elapsed;
    const reachedEnd = this.direction === 1 ? nextTime >= this.duration : nextTime <= 0;
    const previousTime = this.currentTime;
    this.currentTime = Math.max(0, Math.min(nextTime, this.duration));
    try {
      this.renderAt(this.currentTime, true, previousTime);
    } catch (error) {
      this.pause();
      this.onErrorCallback?.(error);
      throw error;
    }

    if (typeof this.onUpdateCallback === 'function') {
      this.onUpdateCallback(this.duration === 0 ? 1 : this.currentTime / this.duration, this.currentTime);
    }
    if (!reachedEnd) { this.schedule(); return; }
    if (this.loop) {
      if (this.yoyo) this.direction *= -1;
      else {
        this.currentTime = this.direction === 1 ? 0 : this.duration;
        this.marks.forEach(mark => { mark.emitted = false; });
      }
      this.anchorTime = this.currentTime;
      this.anchorTimestamp = timestamp;
      this.schedule();
      return;
    }
    this.isPlaying = false;
    this.isComplete = true;
    if (!this.completionCalled && typeof this.onCompleteCallback === 'function') {
      this.completionCalled = true;
      this.onCompleteCallback();
    }
  }

  lifecycleContext(entry, time, previousTime) {
    return Object.freeze({
      element: entry.unit.element,
      time,
      previousTime,
      direction: time >= previousTime ? 1 : -1,
      timeline: this
    });
  }

  emitMarks(time, previousTime, invoke = false) {
    if (!invoke || time < previousTime) return;
    for (const mark of this.marks) {
      const crossed = mark.offset === 0
        ? previousTime <= 0 && time >= 0
        : previousTime < mark.offset && time >= mark.offset;
      if (!crossed || mark.emitted) continue;
      mark.emitted = true;
      this.onMarkCallback?.(Object.freeze({ name: mark.name, metadata: mark.metadata, time: mark.offset }));
    }
  }

  renderAt(time, invokeLifecycle = false, previousTime = time) {
    for (const entry of this.animations) {
      const startTime = entry.offset + entry.unit.config.delay;
      if (time < startTime) continue;
      const progress = entry.unit.easing(entryProgress(entry, time));
      const context = this.lifecycleContext(entry, time, previousTime);
      entry.unit.render(progress, context);
      if (!invokeLifecycle) continue;
      const movingForward = time >= previousTime;
      const crossedStart = movingForward ? previousTime <= startTime && time >= startTime : previousTime >= entry.endTime && time <= entry.endTime;
      const crossedEnd = movingForward ? previousTime < entry.endTime && time >= entry.endTime : previousTime > startTime && time <= startTime;
      if (crossedStart && !entry.startCalled) {
        entry.startCalled = true;
        entry.unit.start?.(context);
      }
      if (time >= startTime && time <= entry.endTime && typeof entry.unit.config.onUpdate === 'function') {
        entry.unit.config.onUpdate(entry.unit.element, progress, 0);
      }
      if (crossedEnd && !entry.completeCalled) {
        entry.completeCalled = true;
        entry.unit.complete?.(context);
      }
    }
    this.emitMarks(time, previousTime, invokeLifecycle);
  }
}

export function create(options) { return new Timeline(options); }
export default { create };
