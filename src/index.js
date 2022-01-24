'use strict';

const traverse = require('./traverse.js');
const setValueAtPath = require('./setValueAtPath.js');

const DATA_TYPE_KEY = '$__type';
const UNTOUCHED = Symbol('serializer.untouched');

/**
 * @param {any} value
 */
function shallowClone(value) {
  if (typeof value !== 'object' || value === null) return value;
  return Array.isArray(value) ? [...value] : { ...value };
}

/**
 * @template Type
 * @template Context
 * @typedef {Object} TypeSerializer
 * @prop {(new () => Type) | string} type
 * @prop {((value: Type, context?: Context) => any)=} toJSON
 * @prop {((value: any, context?: Context) => Type)=} fromJSON
 */

/** @type {TypeSerializer<Error, {}>} */
const ERROR_SERIALIZER = {
  type: Error,

  toJSON(error) {
    return {
      message: error.message || 'unknown_error',
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack,
    };
  },

  fromJSON(data) {
    const error = new Error(data.message);

    if (data.code) {
      error.code = data.code;
    }

    if (data.statusCode) {
      error.statusCode = data.statusCode;
    }

    if (error.stack) {
      const errorWithoutLocation = error.stack.split(' at ')[0];
      error.stack = `${errorWithoutLocation} at Remote Process\n`;
    }

    return error;
  },
};

/** @type {TypeSerializer<Date, {}>} */
const DATE_SERIALIZER = {
  type: Date,

  toJSON(date) {
    // this makes sure its tagged so we can find it when unserializing
    return date.toJSON();
  },

  fromJSON(date) {
    return new Date(date);
  },
};

/** @type {TypeSerializer<Buffer, {}>} */
const BUFFER_SERIALIZER = {
  type: Buffer,

  toJSON(buffer) {
    return Array.from(buffer);
  },

  fromJSON(data) {
    return Buffer.from(data);
  },
};

/**
 * @param {TypeSerializer<any, any>} serializer
 * @param {object} value
 */
function canSerializeValue(serializer, value) {
  if (typeof serializer.type === 'string') {
    return value.constructor && value.constructor.name === serializer.type;
  }
  return value instanceof serializer.type;
}

/**
 * @param {TypeSerializer<any, any>} serializer
 */
function getTypeName(serializer) {
  return typeof serializer.type === 'string' ? serializer.type : serializer.type.name;
}

/**
 * @template Context
 */
class Serializer {

  /**
   * @param {TypeSerializer<any, Context>[]} serializers
   */
  constructor(serializers = Serializer.baseTypes) {
    /** @type {TypeSerializer<any, Context>[]} */
    this._replacers = [];
    /** @type {Map<string, TypeSerializer<any, Context>>} */
    this._revivers = new Map();

    for (const serializer of serializers) {
      this.registerSerializable(serializer);
    }

    this.serialize = this.serialize.bind(this);
    this.parse = this.parse.bind(this);
  }

  /**
   * @template T
   * @param {TypeSerializer<T, Context>} serializer
   */
  registerSerializable(serializer) {
    this._revivers.set(getTypeName(serializer), serializer);

    if (typeof serializer.toJSON === 'function') {
      this._replacers.push(serializer);
    }
  }

  /**
   * serialize finds the supported types, replaces them with
   * a json representation and tags them with a type property.
   * Note that serialize clones the object passed to it.
   *
   * @param {any} object
   * @param {Context=} context
   */
  serialize(object, context) {
    const serializedObject = this._serializeValue(object, context);
    if (serializedObject !== UNTOUCHED) {
      return serializedObject;
    }

    const result = {};
    traverse(object, (path, value) => {
      const serialized = this._serializeValue(value, context);
      if (serialized !== UNTOUCHED) {
        setValueAtPath(path, serialized, result);
        return traverse.SIBLING;
      }

      setValueAtPath(path, shallowClone(value), result);
      return traverse.CONTINUE;
    });

    return result;
  }

  /**
   * @param {any} value
   * @param {Context=} context
   */
  _serializeValue(value, context) {
    if (typeof value !== 'object' || value === null) {
      return value;
    }

    for (const serializer of this._replacers) {
      if (canSerializeValue(serializer, value) && typeof serializer.toJSON === 'function') {
        return {
          [DATA_TYPE_KEY]: getTypeName(serializer),
          data: serializer.toJSON(value, context),
        };
      }
    }

    if (typeof value.toJSON === 'function') {
      return value.toJSON();
    }

    return UNTOUCHED;
  }

  /**
   * parse finds all tagged objects (with a type and a data property) and
   * revives them to a class instance.
   * Note that parse mutates the object that is passed to it.
   *
   * @param {any} object
   * @param {Context=} context
   */
  async parse(object, context) {
    const parsedObject = this._parseValue(object, context);
    if (parsedObject !== UNTOUCHED) {
      return parsedObject;
    }

    /** @type {Array<Promise<any>>} */
    const waitFor = [];

    traverse(object, (path, value) => {
      const parsed = this._parseValue(value, context);
      if (parsed !== UNTOUCHED) {
        if (parsed instanceof Promise) {
          waitFor.push(parsed.then(resolved => setValueAtPath(path, resolved, object)));
        }

        setValueAtPath(path, parsed, object);
        return traverse.SIBLING;
      }

      setValueAtPath(path, value, object);
      return traverse.CONTINUE;
    });

    if (waitFor.length) {
      return Promise.all(waitFor).then(() => object);
    }

    return object;
  }

  /**
   * @param {any} value
   * @param {Context=} context
   */
  _parseValue(value, context) {
    if (value && value[DATA_TYPE_KEY] && value.data) {
      const serializer = this._revivers.get(value[DATA_TYPE_KEY]);
      if (serializer && typeof serializer.fromJSON === 'function') {
        return serializer.fromJSON(value.data, context);
      }

      return value.data;
    }

    return UNTOUCHED;
  }

  /**
   * Resolve root-properties promises
   *
   * @param {any} object
   * @param {Context=} context
   */
  async parseAsync(object, context) {
    const data = this.parse(object, context);

    if (typeof data === 'object' && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        if (value instanceof Promise) {
          data[key] = await value;
        }
      }
    }

    return data;
  }

  /**
   * support for serializing basic types; Error, Date and Buffer
   * @type {TypeSerializer<any, any>[]}
   */
  static baseTypes = [
    ERROR_SERIALIZER,
    DATE_SERIALIZER,
    BUFFER_SERIALIZER,
  ];

  static baseTypeError = ERROR_SERIALIZER;
  static baseTypeDate = DATE_SERIALIZER;
  static baseTypeBuffer = BUFFER_SERIALIZER;

}

module.exports = Serializer;
