/**
 * Deep merge two configuration objects.
 * Switch values override base values. null in switch means "delete" the key.
 */
export function deepMerge(base, switchConfig) {
  if (base === null || base === undefined) return switchConfig;
  if (switchConfig === null || switchConfig === undefined) return base;

  if (!isPlainObject(base) || !isPlainObject(switchConfig)) {
    return switchConfig;
  }

  const result = { ...base };

  for (const key of Object.keys(switchConfig)) {
    const switchVal = switchConfig[key];

    if (switchVal === null) {
      delete result[key];
    } else if (isPlainObject(switchVal) && isPlainObject(result[key])) {
      result[key] = deepMerge(result[key], switchVal);
    } else {
      result[key] = switchVal;
    }
  }

  return result;
}

export function deepForceBase(currentConfig, baseConfig) {
  if (!isPlainObject(currentConfig) || !isPlainObject(baseConfig)) {
    return baseConfig;
  }

  const result = { ...currentConfig };

  for (const key of Object.keys(baseConfig)) {
    const baseVal = baseConfig[key];
    const currentVal = currentConfig[key];

    if (isPlainObject(baseVal) && isPlainObject(currentVal)) {
      result[key] = deepForceBase(currentVal, baseVal);
    } else {
      result[key] = baseVal;
    }
  }

  return result;
}

function isPlainObject(val) {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

/**
 * Compute a human-readable diff between base and merged configs.
 */
export function computeDiff(base, merged, path = '') {
  const diffs = [];
  const allKeys = new Set([...Object.keys(base || {}), ...Object.keys(merged || {})]);

  for (const key of allKeys) {
    const currentPath = path ? `${path}.${key}` : key;
    const baseVal = base?.[key];
    const mergedVal = merged?.[key];

    if (!(key in (base || {}))) {
      diffs.push({ path: currentPath, type: 'added', value: mergedVal });
    } else if (!(key in (merged || {}))) {
      diffs.push({ path: currentPath, type: 'removed', value: baseVal });
    } else if (isPlainObject(baseVal) && isPlainObject(mergedVal)) {
      diffs.push(...computeDiff(baseVal, mergedVal, currentPath));
    } else if (JSON.stringify(baseVal) !== JSON.stringify(mergedVal)) {
      diffs.push({ path: currentPath, type: 'changed', from: baseVal, to: mergedVal });
    }
  }

  return diffs;
}
