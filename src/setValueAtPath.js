'use strict';

/**
 * @param {Array<string | number>} pathArray
 * @param {any} value
 * @param {any} object
 * @returns {void}
 */
function setValueAtPath(pathArray, value, object) {
  if (object === null || object === undefined) {
    throw new Error('path does not exist in target object');
  }

  const property = pathArray[0];

  // check whether we are at the end of the path array
  if (pathArray.length > 1) {
    // "eat" one property of the path and move deeper into the object
    const nextPath = pathArray.slice(1);
    const nextObject = object[property];
    setValueAtPath(nextPath, value, nextObject);
    return;
  }

  // we are at the end of the path so we can mutate the property
  object[property] = value;
}

module.exports = setValueAtPath;
