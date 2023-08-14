/**
 * LRUCache
 * ===================
 *
 * JavaScript implementation of the LRU Cache data structure. To save up
 * memory and allocations this implementation represents its underlying
 * doubly-linked list as static arrays and pointers. Thus, memory is allocated
 * only once at instantiation and JS objects are never created to serve as
 * pointers. This also means this implementation does not trigger too many
 * garbage collections.
 *
 * Note that to save up memory, a LRU Cache can be implemented using a singly
 * linked list by storing predecessors' pointers as hashmap values.
 * However, this means more hashmap lookups and would probably slow the whole
 * thing down. What's more, pointers are not the things taking most space in
 * memory.
 */

import { createNanoEvents, type Emitter, type Unsubscribe } from "nanoevents";
import { getPointerArray, type PointerArray } from "./get-pointer-array.js";

function from<TKey extends string | number, TValue>(
  iterable: Iterable<[TKey, TValue]> & Partial<{ size: number; length: number }>,
  capacity: number = iterable.size || iterable.length || 0,
) {
  const cache = new LRUCache(capacity);
  for (const [key, value] of iterable) {
    cache.set(key, value);
  }
  return cache;
}

export interface Events<TKey extends string | number, TValue> {
  evicted: (key: TKey, value: TValue) => void;
}

export interface Emitting<TEvents> {
  on<K extends keyof TEvents>(this: this, event: K, cb: TEvents[K]): Unsubscribe;
}

/**
 * LRUCache.
 *
 * @constructor
 * @param {function} Keys     - Array class for storing keys.
 * @param {function} Values   - Array class for storing values.
 * @param {number}   capacity - Desired capacity.
 */
export class LRUCache<TKey extends string | number = string | number, TValue = any>
  implements Iterable<[TKey, TValue]>, Emitting<Events<TKey, TValue>>
{
  readonly capacity: number;

  private readonly forward: PointerArray;
  private readonly backward: PointerArray;
  private readonly K: Array<TKey>;
  private readonly V: Array<TValue>;

  private readonly events: Emitter<Events<TKey, TValue>>;

  _size: number;
  private head: number;
  private tail: number;
  private items: Record<TKey, number>;

  /**
   * Take an arbitrary iterable and convert it into a structure.
   */
  static from = from;

  constructor(capacity: number) {
    this.capacity = capacity;
    if (!isFinite(this.capacity) || Math.floor(this.capacity) !== this.capacity || this.capacity <= 0) {
      throw new Error("Capacity should be a finite positive integer.");
    }
    const PointerArray = getPointerArray(capacity);

    this.forward = new PointerArray(capacity);
    this.backward = new PointerArray(capacity);
    this.K = new Array(capacity);
    this.V = new Array(capacity);
    this.events = createNanoEvents<Events<TKey, TValue>>();

    this._size = 0;
    this.head = 0;
    this.tail = 0;
    this.items = {} as Record<TKey, number>; // FIXME use Map??
  }

  on<K extends keyof Events<TKey, TValue>>(event: K, cb: Events<TKey, TValue>[K]): Unsubscribe {
    return this.events.on(event, cb);
  }

  get size(): number {
    return this._size;
  }

  /**
   * Clear the structure.
   */
  clear(): void {
    this._size = 0;
    this.head = 0;
    this.tail = 0;
    this.items = {} as Record<TKey, number>; // FIXME use Map??
  }

  /**
   * Splay a value on top.
   * @param pointer Pointer of the value to splay on top.
   */
  splayOnTop(pointer: number): void {
    const oldHead = this.head;
    if (this.head === pointer) return;

    const previous = this.backward[pointer];
    const next = this.forward[pointer];

    if (this.tail === pointer) {
      this.tail = previous;
    } else {
      this.backward[next] = previous;
    }

    this.forward[previous] = next;

    this.backward[oldHead] = pointer;
    this.head = pointer;
    this.forward[pointer] = oldHead;
  }

  /**
   * Set the value for the given key in the cache.
   */
  set(key: TKey, value: TValue): void {
    let pointer = this.items[key];

    // The key already exists, we just need to update the value and splay on top
    if (pointer !== undefined) {
      this.splayOnTop(pointer);
      this.V[pointer] = value;
      return;
    }

    // The cache is not yet full
    if (this._size < this.capacity) {
      pointer = this._size++;
    }
    // Cache is full, we need to drop the last value
    else {
      pointer = this.tail;
      this.tail = this.backward[pointer];
      delete this.items[this.K[pointer]];
      this.events.emit("evicted", this.K[pointer], this.V[pointer]);
    }
    this.storeKeyValue(pointer, key, value);
  }

  /**
   * Set the value for the given key in the cache
   * @param key
   * @param value
   * @return {{evicted: boolean, key: any, value: any}} An object containing the
   * key and value of an item that was overwritten or evicted in the set
   * operation, as well as a boolean indicating whether it was evicted due to
   * limited capacity. Return value is null if nothing was evicted or overwritten
   * during the set operation.
   */
  setpop(key: TKey, value: TValue): null | { value: TValue; key: TKey; evicted: boolean } {
    let oldValue;
    let oldKey;

    let pointer = this.items[key];

    // The key already exists, we just need to update the value and splay on top
    if (pointer !== undefined) {
      this.splayOnTop(pointer);
      oldValue = this.V[pointer];
      this.V[pointer] = value;
      return { evicted: false, key: key, value: oldValue };
    }

    // The cache is not yet full
    if (this._size < this.capacity) {
      pointer = this._size++;
    }

    // Cache is full, we need to drop the last value
    else {
      pointer = this.tail;
      this.tail = this.backward[pointer];
      oldValue = this.V[pointer];
      oldKey = this.K[pointer];
      delete this.items[this.K[pointer]];
      this.events.emit("evicted", this.K[pointer], this.V[pointer]);
    }

    this.storeKeyValue(pointer, key, value);

    // Return object if eviction took place, otherwise return null
    if (oldKey) {
      return { evicted: true, key: oldKey as TKey, value: oldValue as TValue };
    } else {
      return null;
    }
  }

  /**
   * Check whether the key exists in the cache.
   */
  has(key: TKey): boolean {
    return key in this.items;
  }

  /**
   * Get the value attached to the given key. Will move the
   * related key to the front of the underlying linked list.
   */
  get(key: TKey): TValue | undefined {
    const pointer = this.items[key];
    if (pointer === undefined) return;
    this.splayOnTop(pointer);
    return this.V[pointer];
  }

  /**
   * Method used to get the value attached to the given key. Does not modify
   * the ordering of the underlying linked list.
   */
  peek(key: TKey): TValue | undefined {
    const pointer = this.items[key];
    if (pointer === undefined) return;
    return this.V[pointer];
  }

  /**
   * Create an iterator over the cache's keys from most
   * recently used to least recently used.
   */
  keys(): Iterator<TKey> & Iterable<TKey> {
    let i = 0;
    const l = this._size;

    let pointer = this.head;
    const keys = this.K;
    const forward = this.forward;

    return {
      [Symbol.iterator](): Iterator<TKey> {
        return this;
      },
      next(): IteratorResult<TKey> {
        if (i >= l) return { done: true, value: undefined };
        const key = keys[pointer];
        i++;
        if (i < l) {
          pointer = forward[pointer];
        }
        return {
          done: false,
          value: key,
        };
      },
    };
  }

  /**
   * Create an iterator over the cache's values from most
   * recently used to least recently used.
   */
  values(): Iterator<TValue> & Iterable<TValue> {
    let i = 0;
    const l = this._size;

    let pointer = this.head;
    const values = this.V;
    const forward = this.forward;

    return {
      [Symbol.iterator](): Iterator<TValue> {
        return this;
      },
      next(): IteratorResult<TValue> {
        if (i >= l) return { done: true, value: undefined };

        const value = values[pointer];
        i++;
        if (i < l) pointer = forward[pointer];
        return {
          done: false,
          value: value,
        };
      },
    };
  }

  /**
   * Create an iterator over the cache's entries from most
   * recently used to least recently used.
   */
  entries(): Iterator<[TKey, TValue]> & Iterable<[TKey, TValue]> {
    let i = 0;
    const l = this._size;

    let pointer = this.head;
    const keys = this.K;
    const values = this.V;
    const forward = this.forward;
    return {
      [Symbol.iterator](): Iterator<[TKey, TValue]> {
        return this;
      },
      next(): IteratorResult<[TKey, TValue]> {
        if (i >= l) return { done: true, value: undefined };

        const key = keys[pointer];
        const value = values[pointer];
        i++;
        if (i < l) pointer = forward[pointer];
        return {
          done: false,
          value: [key, value],
        };
      },
    };
  }

  inspect(): Map<TKey, TValue> {
    const proxy = new Map();

    let iterator = this.entries(),
      step;

    while (((step = iterator.next()), !step.done)) proxy.set(step.value[0], step.value[1]);

    // Trick so that node displays the name of the constructor
    Object.defineProperty(proxy, "constructor", {
      value: LRUCache,
      enumerable: false,
    });

    return proxy;
  }

  private storeKeyValue(pointer: number, key: TKey, value: TValue): void {
    // Storing key & value
    this.items[key] = pointer;
    this.K[pointer] = key;
    this.V[pointer] = value;

    // Moving the item at the front of the list
    this.forward[pointer] = this.head;
    this.backward[this.head] = pointer;
    this.head = pointer;
  }

  [Symbol.iterator]() {
    return this.entries();
  }

  [Symbol.for("nodejs.util.inspect.custom")]() {
    return this.inspect();
  }
}
