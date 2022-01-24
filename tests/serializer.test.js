/* eslint-disable arrow-parens, padded-blocks */
/* global test, expect */

'use strict';

const Serializer = require('../src/index.js');

class Value {
  constructor(id) {
    this.id = id;
  }
}

test('can serialize and parse a value', async () => {
  const serializer = new Serializer([
    {
      type: Value,
      toJSON(value) {
        return { id: value.id };
      },
      fromJSON(data) {
        return new Value(data.id);
      },
    },
  ]);

  const data = serializer.serialize(new Value(69105));

  expect(data).toEqual({
    $__type: 'Value',
    data: { id: 69105 },
  });

  const result = await serializer.parse(data);

  expect(result).toEqual(new Value(69105));
  expect(result).toBeInstanceOf(Value);
});

test('can serialize and parse nested values', async () => {
  const serializer = new Serializer([
    {
      type: Value,
      toJSON(value) {
        return { id: value.id };
      },
      fromJSON(data) {
        return new Value(data.id);
      },
    },
  ]);

  const original = {
    nested: {
      one: new Value(69105),
      two: new Value(42),
    },
  };

  const data = serializer.serialize(original);

  // serialize clones the object
  expect(data).not.toBe(original);
  expect(data).toEqual({
    nested: {
      one: {
        $__type: 'Value',
        data: { id: 69105 },
      },
      two: {
        $__type: 'Value',
        data: { id: 42 },
      },
    },
  });

  const result = await serializer.parse(data);

  // parse mutates the object
  expect(result).toBe(data);
  expect(data).toEqual({
    nested: {
      one: new Value(69105),
      two: new Value(42),
    },
  });
  expect(data.nested.one).toBeInstanceOf(Value);
  expect(data.nested.two).toBeInstanceOf(Value);
});

test('uses value.toJSON if defined', () => {
  const serializer = new Serializer();

  const value = new Value(69105);
  value.toJSON = function toJSON() {
    return `Value:${this.id}`;
  };

  const data = serializer.serialize({ value });

  expect(data).toEqual({ value: 'Value:69105' });
});

test('parse keeps objects with non-enumerable properties', async () => {
  const serializer = new Serializer();

  // error.message is non-enumerable
  const data = new Error('testing 123');
  const result = await serializer.parse(data);

  expect(result).toEqual(new Error('testing 123'));
  expect(result).toBeInstanceOf(Error);
});

test('can parse using async fromJSON', async () => {
  const serializer = new Serializer([
    {
      type: Value,
      toJSON(value) {
        return { id: value.id };
      },
      fromJSON(data) {
        return Promise.resolve(new Value(data.id));
      },
    },
  ]);

  const data = {
    value: {
      $__type: 'Value',
      data: { id: 69105 },
    },
  };

  const result = await serializer.parse(data);

  expect(result).toEqual({ value: new Value(69105) });
  expect(result.value).toBeInstanceOf(Value);
});

test('serialize() returns non-object values without touching them', () => {
  const serializer = new Serializer();

  const number = serializer.serialize(42);
  expect(number).toEqual(42);

  const string = serializer.serialize('test');
  expect(string).toEqual('test');

  const symbol = serializer.serialize(Symbol.for('test'));
  expect(symbol).toEqual(Symbol.for('test'));

  const notDefined = serializer.serialize(undefined);
  expect(notDefined).toEqual(undefined);

  // technically an object but...
  const nullish = serializer.serialize(null);
  expect(nullish).toEqual(null);
});

test('serialize() handles encountering various types', () => {
  const serializer = new Serializer();

  const number = serializer.serialize({ value: 42 });
  expect(number).toEqual({ value: 42 });

  const string = serializer.serialize({ value: 'test' });
  expect(string).toEqual({ value: 'test' });

  const symbol = serializer.serialize({ value: Symbol.for('test') });
  expect(symbol).toEqual({ value: Symbol.for('test') });

  const notDefined = serializer.serialize({ value: undefined });
  expect(notDefined).toEqual({ value: undefined });

  // technically an object but...
  const nullish = serializer.serialize({ value: null });
  expect(nullish).toEqual({ value: null });
});

test('parse() returns non-object values without touching them', async () => {
  const serializer = new Serializer();

  const number = await serializer.parse(42);
  expect(number).toEqual(42);

  const string = await serializer.parse('test');
  expect(string).toEqual('test');

  const symbol = await serializer.parse(Symbol.for('test'));
  expect(symbol).toEqual(Symbol.for('test'));

  const notDefined = await serializer.parse(undefined);
  expect(notDefined).toEqual(undefined);

  // technically an object but...
  const nullish = await serializer.parse(null);
  expect(nullish).toEqual(null);
});

test('parse() handles encountering various types', async () => {
  const serializer = new Serializer();

  const number = await serializer.parse({ value: 42 });
  expect(number).toEqual({ value: 42 });

  const string = await serializer.parse({ value: 'test' });
  expect(string).toEqual({ value: 'test' });

  const symbol = await serializer.parse({ value: Symbol.for('test') });
  expect(symbol).toEqual({ value: Symbol.for('test') });

  const notDefined = await serializer.parse({ value: undefined });
  expect(notDefined).toEqual({ value: undefined });

  // technically an object but...
  const nullish = await serializer.parse({ value: null });
  expect(nullish).toEqual({ value: null });
});
