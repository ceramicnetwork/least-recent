import { test } from "uvu";
import * as assert from "uvu/assert";
import { LRUCache } from "./most-recent.js";

const INVALID_CAPACITIES = [undefined, {}, -1, true, 1.01, Infinity];
for (const capacity of INVALID_CAPACITIES) {
  test(`invalid capacity ${capacity}`, () => {
    assert.throws(() => {
      // @ts-expect-error
      new LRUCache(capacity);
    });
  });
}

test("should be possible to create a LRU cache.", () => {
  const cache = new LRUCache<string, number>(3);

  assert.equal(cache.capacity, 3);

  cache.set("one", 1);
  cache.set("two", 2);

  assert.equal(cache.size, 2);

  assert.equal(Array.from(cache.entries()), [
    ["two", 2],
    ["one", 1],
  ]);

  cache.set("three", 3);

  assert.equal(cache.size, 3);
  assert.equal(Array.from(cache.entries()), [
    ["three", 3],
    ["two", 2],
    ["one", 1],
  ]);

  cache.set("four", 4);

  assert.equal(cache.size, 3);
  assert.equal(Array.from(cache.entries()), [
    ["four", 4],
    ["three", 3],
    ["two", 2],
  ]);

  cache.set("two", 5);
  assert.equal(Array.from(cache.entries()), [
    ["two", 5],
    ["four", 4],
    ["three", 3],
  ]);

  assert.equal(cache.has("four"), true);
  assert.equal(cache.has("one"), false);

  assert.equal(cache.get("one"), undefined);
  assert.equal(cache.get("four"), 4);

  assert.equal(Array.from(cache.entries()), [
    ["four", 4],
    ["two", 5],
    ["three", 3],
  ]);

  assert.equal(cache.get("three"), 3);
  assert.equal(Array.from(cache.entries()), [
    ["three", 3],
    ["four", 4],
    ["two", 5],
  ]);

  assert.equal(cache.get("three"), 3);
  assert.equal(Array.from(cache.entries()), [
    ["three", 3],
    ["four", 4],
    ["two", 5],
  ]);

  assert.equal(cache.peek("two"), 5);
  assert.equal(Array.from(cache.entries()), [
    ["three", 3],
    ["four", 4],
    ["two", 5],
  ]);
});

test("should be possible to clear a LRU cache.", () => {
  const cache = new LRUCache(3);

  cache.set("one", 1);
  cache.set("two", 2);
  cache.set("one", 3);

  assert.equal(Array.from(cache.entries()), [
    ["one", 3],
    ["two", 2],
  ]);

  assert.equal(cache.get("two"), 2);

  assert.equal(Array.from(cache.entries()), [
    ["two", 2],
    ["one", 3],
  ]);

  cache.clear();

  assert.equal(cache.capacity, 3);
  assert.equal(cache.size, 0);

  assert.equal(cache.has("two"), false);

  cache.set("one", 1);
  cache.set("two", 2);
  cache.set("three", 3);
  cache.set("two", 6);
  cache.set("four", 4);

  assert.equal(Array.from(cache.entries()), [
    ["four", 4],
    ["two", 6],
    ["three", 3],
  ]);
});

test("should be possible to create an iterator over the cache's keys.", () => {
  const cache = new LRUCache(3);

  cache.set("one", 1);
  cache.set("two", 2);
  cache.set("three", 3);

  assert.equal(Array.from(cache.keys()), ["three", "two", "one"]);
});

test("should be possible to create an iterator over the cache's values.", () => {
  const cache = new LRUCache(3);

  cache.set("one", 1);
  cache.set("two", 2);
  cache.set("three", 3);

  assert.equal(Array.from(cache.values()), [3, 2, 1]);
});

test("should be possible to pop an evicted value when items are evicted from cache", () => {
  const cache = new LRUCache(3);

  cache.set("one", 1);
  cache.set("two", 2);
  cache.set("three", 3);

  const popResult = cache.setpop("four", 4);
  assert.equal(popResult, { evicted: true, key: "one", value: 1 });
  assert.equal(Array.from(cache.values()), [4, 3, 2]);
});

test("should return null when setting an item does not overwrite or evict", () => {
  const cache = new LRUCache(3);

  cache.set("one", 1);
  cache.set("two", 2);
  const popResult = cache.setpop("three", 3);
  assert.equal(popResult, null);
});

test("should be possible to pop an overwritten value when items are overwritten from cache", () => {
  const cache = new LRUCache(3);

  cache.set("one", 1);
  cache.set("two", 2);
  cache.set("three", 3);

  const popResult = cache.setpop("three", 10);
  assert.equal(popResult, { evicted: false, key: "three", value: 3 });
  assert.equal(Array.from(cache.values()), [10, 2, 1]);
});

test("should work with capacity = 1.", () => {
  const cache = new LRUCache(1);

  cache.set("one", 1);
  cache.set("two", 2);
  cache.set("three", 3);

  assert.equal(Array.from(cache.entries()), [["three", 3]]);
  assert.equal(cache.get("one"), undefined);
  assert.equal(cache.get("three"), 3);
  assert.equal(cache.get("three"), 3);

  assert.equal(Array.from(cache.entries()), [["three", 3]]);
});

test("should be possible to create a cache from an arbitrary iterable.", () => {
  const cache = LRUCache.from(
    new Map([
      ["one", 1],
      ["two", 2],
    ]),
  );
  assert.equal(cache.capacity, 2);

  assert.equal(Array.from(cache.entries()), [
    ["two", 2],
    ["one", 1],
  ]);
});

// test("should be possible to create a specialized cache.", function () {
//   var cache = new Cache(Uint8Array, Float64Array, 3);
//
//   cache.set(3, 5.6);
//   cache.set(12, 6.464);
//   cache.set(23, 0.45);
//   cache.set(59, -0.464);
//
//   assert.equal(Array.from(cache.entries()), [
//     [59, -0.464],
//     [23, 0.45],
//     [12, 6.464],
//   ]);
//
//   var cacheFrom = Cache.from([], Uint8Array, Float64Array, 3);
//
//   cacheFrom.set(3, 5.6);
//   cacheFrom.set(12, 6.464);
//   cacheFrom.set(23, 0.45);
//   cacheFrom.set(59, -0.464);
//
//   assert.equal(Array.from(cacheFrom.entries()), [
//     [59, -0.464],
//     [23, 0.45],
//     [12, 6.464],
//   ]);
// });

// test("should be possible to iterate over the cache using a callback.", function () {
//   var cache = new Cache(1);
//
//   cache.set("one", 1);
//   cache.set("two", 2);
//   cache.set("three", 3);
//
//   var entries = [];
//
//   cache.forEach(function (value, key) {
//     entries.push([key, value]);
//   });
//
//   assert.equal(entries, Array.from(cache.entries()));
// });

test("should be possible to iterate over the cache.", () => {
  const cache = new LRUCache(1);
  cache.set("one", 1);
  cache.set("two", 2);
  cache.set("three", 3);
  const entries = [];
  for (const entry of cache) {
    entries.push(entry);
  }
  assert.equal(entries, Array.from(cache.entries()));
});

test("emit event on eviction", () => {
  const cache = new LRUCache<string, number>(1);
  const events: Array<[string, number]> = [];
  cache.on("evicted", (key, value) => {
    events.push([key, value]);
  });
  cache.set("one", 1);
  cache.set("two", 2);
  cache.set("three", 3);
  assert.equal(events, [
    ["one", 1],
    ["two", 2],
  ]);
});

test.run();
