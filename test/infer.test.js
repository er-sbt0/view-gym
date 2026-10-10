import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inferTags, INFERABLE } from '../lib/infer.js';
import { PRESETS } from '../lib/presets.js';

const exerciseOf = (title) => inferTags(title).exercise;

test('infers weightlifting movements', () => {
  assert.deepEqual(inferTags('Chinese vs Russian clean form'),
    { exercise: 'Clean', muscles: ['Full Body'], equipment: ['Barbell'] });
  assert.equal(exerciseOf('Clean & Jerk PR 140kg'), 'Clean and Jerk');
  assert.equal(exerciseOf('Hang Power Clean tips'), 'Power Clean');
  assert.equal(exerciseOf('Squat clean technique'), 'Clean');
  assert.equal(exerciseOf('Snatch pulls for speed'), 'Snatch');
  assert.equal(exerciseOf('Split jerk footwork'), 'Jerk');
});

test('prefers the more specific exercise', () => {
  assert.equal(exerciseOf('Front Squat mobility'), 'Front Squat');
  assert.equal(exerciseOf('RDL vs Deadlift'), 'Romanian Deadlift');
  assert.equal(exerciseOf('Romanian Deadlift form check'), 'Romanian Deadlift');
  assert.equal(exerciseOf('Incline bench press for upper chest'), 'Incline Bench Press');
  assert.equal(exerciseOf('Bulgarian split squats are brutal'), 'Bulgarian Split Squat');
  assert.equal(exerciseOf('Overhead squat drills'), 'Overhead Squat');
});

test('first exercise named wins', () => {
  assert.equal(exerciseOf('Squat vs Deadlift: which is better?'), 'Squat');
  assert.equal(exerciseOf('Deadlift vs Squat'), 'Deadlift');
});

test('handles plurals and hyphenation', () => {
  assert.equal(exerciseOf('10 Pull-Ups a day'), 'Pull-up');
  assert.equal(exerciseOf('Weighted pullups'), 'Pull-up');
  assert.equal(exerciseOf('Perfect squats'), 'Squat');
});

test('equipment in the title overrides the default', () => {
  assert.deepEqual(inferTags('Dumbbell bench press').equipment, ['Dumbbell']);
  assert.deepEqual(inferTags('Smith machine squat').equipment, ['Smith Machine']);
  assert.deepEqual(inferTags('Bench press').equipment, ['Barbell']);
});

test('muscles come from the exercise and the title, not the exercise phrase', () => {
  assert.deepEqual(inferTags('Back squat').muscles, ['Quads', 'Glutes']);
  assert.deepEqual(inferTags('Lunges for glutes and hamstrings').muscles, ['Quads', 'Glutes', 'Hamstrings']);
});

test('does not misfire on partial words or unrelated titles', () => {
  assert.deepEqual(inferTags('My morning routine'), { exercise: '', muscles: [], equipment: [] });
  assert.equal(exerciseOf('Benchmark results'), '');
  assert.equal(exerciseOf('Leg curl machine'), '');
  assert.deepEqual(inferTags('').exercise, '');
});

test('every inferable name is a preset', () => {
  for (const key of ['exercises', 'muscles', 'equipment']) {
    for (const name of INFERABLE[key]) assert.ok(PRESETS[key].includes(name), `${key}: ${name}`);
  }
});
