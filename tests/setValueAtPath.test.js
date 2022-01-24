/* eslint-disable arrow-parens */
/* global test, expect */

'use strict';

const setValueAtPath = require('../src/setValueAtPath.js');

test('can set nested object values', () => {
  const obj = {
    some: { deeply: [{ nested: { value: 'hello world' } }] },
  };

  setValueAtPath(['some', 'deeply', 0, 'nested', 'value'], 42, obj);

  expect(obj).toEqual({
    some: { deeply: [{ nested: { value: 42 } }] },
  });
});
