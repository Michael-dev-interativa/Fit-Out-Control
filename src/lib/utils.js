import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function groupBy(arr, key) {
  if (!Array.isArray(arr)) return {};
  const getter = typeof key === 'function' ? key : (item) => (item == null ? undefined : item[key]);
  return arr.reduce((acc, item) => {
    const k = getter(item) ?? "";
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

export function uniq(arr) {
  if (!Array.isArray(arr)) return [];
  return Array.from(new Set(arr.filter(Boolean)));
}

export function keyBy(arr, key) {
  if (!Array.isArray(arr)) return {};
  return arr.reduce((acc, item) => {
    const k = item == null ? undefined : item[key];
    if (k !== undefined) acc[k] = item;
    return acc;
  }, {});
}