/**
 * Safely convert BigInt properties in objects or arrays to standard Numbers
 * to prevent JSON serialization errors.
 */
function serializeData(data) {
  if (data === null || data === undefined) {
    return data;
  }
  
  if (typeof data === 'bigint') {
    return Number(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(serializeData);
  }
  
  if (typeof data === 'object') {
    const serialized = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        serialized[key] = serializeData(data[key]);
      }
    }
    return serialized;
  }
  
  return data;
}

module.exports = serializeData;
