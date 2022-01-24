# Serializer

This libary contains a utility for replacing and reviving complex values.
This is useful when using a communication channel (WebSockets/IPC) that doesn't support complex JavaScript values (instances of classes).
By default this library is capable of serializing and reviving Errors, Dates and Buffers.

## Usage

The base of this library are the serializer objects that we call `TypeSerializers`, they look like this:

```js
class Value {
  constructor(id) {
    this.id = id;
  }
}

const VALUE_SERIALIZER = {
  type: Value,

  toJSON(value) {
    return { id: value.id };
  },

  fromJSON(data) {
    return new Value(data.id);
  },
};
```

The `type` property contains the type that we want to serialize, it should be either a constructor (will check `value instanceof type`) or a string (will check `value.constructor.name === type`).

Then there are two optional properties, `toJSON` and `fromJSON`, that define the serialization.
When calling `serializer.serialize()` the `toJSON` function will be called for all values that match the type and should return the serialized value. `fromJSON` will be called when `serializer.parse()` encounters a `$__type` tag with a string that matches the type, and can revive a serialized value.

The above serializer can be used with Serializer like this:

```js
const serializer = new Serializer([VALUE_SERIALIZER]);

const data = serializer.serialize({ value: new Value(69105) });

expect(data).toEqual({
  value: {
    $__type: 'Value',
    data: { id: 69105 },
  },
});

const result = serializer.parse(data);

expect(result).toEqual({ value: new Value(69105) });
```
