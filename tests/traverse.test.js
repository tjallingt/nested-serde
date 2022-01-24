/* eslint-disable arrow-parens */
/* global test, expect */

'use strict';

const traverse = require('../src/traverse.js');

test('traverses an object', () => {
  /** @type {any[]} */
  const paths = [];
  /** @type {any[]} */
  const seen = [];

  const obj = {
    fruit: 'tomato',
    nested: {
      soundOfMusic: 'do-re-mi',
      leavesInThePile: 69105,
    },
  };

  traverse(obj, (path, value) => {
    paths.push(path);
    seen.push(value);
    return traverse.CONTINUE;
  });

  expect(paths).toEqual([
    ['fruit'],
    ['nested'],
    ['nested', 'soundOfMusic'],
    ['nested', 'leavesInThePile'],
  ]);

  expect(seen).toEqual([
    'tomato',
    {
      soundOfMusic: 'do-re-mi',
      leavesInThePile: 69105,
    },
    'do-re-mi',
    69105,
  ]);
});

test('detects circular references', () => {
  const ref = {};
  const obj = { ref };
  ref.obj = obj;

  expect(() => traverse(obj, () => traverse.CONTINUE)).toThrowError(/circular reference/i);
});

test('handles multiple references to the same object', () => {
  const ref = {};
  const obj = { ref1: ref, ref2: ref };

  expect(() => traverse(obj, () => traverse.CONTINUE)).not.toThrowError();
});
