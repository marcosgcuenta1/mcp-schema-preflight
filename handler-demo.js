'use strict';
function lookup(args, key) {
  if (!args || typeof args !== 'object' || Array.isArray(args) || Object.keys(args).length !== 1 || !Object.hasOwn(args, key)) throw new Error('Expected exactly the demo argument ' + key);
  const ids = args[key];
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 20 || !ids.every(id => Number.isSafeInteger(id) && id >= 1)) throw new Error('Demo IDs must be 1–20 positive safe integers.');
  return {items: ids.map(id => ({id, label: 'Item ' + id})), count: ids.length};
}
exports.before = args => lookup(args, 'ids[]');
exports.after = args => lookup(args, 'ids');
