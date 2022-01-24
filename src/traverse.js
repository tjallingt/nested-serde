'use strict';

const SIBLING = Symbol('serializer.traverse.sibling');
const CONTINUE = Symbol('serializer.traverse.continue');

/**
 * @param {object} object the target object to traverse
 * @param {(path: Array<string | number>, value: any) => Symbol | void} callback
 * return `traverse.SIBLING` from the callback to move on to sibling properties
 */
function traverse(object, callback) {
  /** @type {any[]} used to track the seen objects to detect circular references */
  const seen = [];

  /**
   * @param {Array<string | number>} path
   * @param {any} parent
   */
  function walk(path, parent) {
    if (typeof parent !== 'object' || parent === null) return;

    if (seen.includes(parent)) throw new Error(`Circular Reference "${path.join('.')}"`);
    seen.push(parent);

    // iterate over the "ownProperties" of the object, skipping symbols
    for (const [key, value] of Object.entries(parent)) {
      const entryPath = [...path, key];
      const action = callback(entryPath, value);
      if (action !== SIBLING) walk(entryPath, value);
    }

    // we move on to sibling properties so we no longer care about this reference
    seen.pop();
  }

  walk([], object);
}

traverse.SIBLING = SIBLING;
traverse.CONTINUE = CONTINUE;

module.exports = traverse;
