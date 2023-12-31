# most-recent

Provides an implementation of LRUCache. Effectively a fork of [LRUCache from Mnemonist](https://github.com/Yomguithereal/mnemonist/tree/master) with one additional feature.

`LRU` standing for _least recently used_, can be seen as a a fixed-capacity key-value store that will evict infrequent items when full and setting new keys.

For instance, if one creates a `LRUCache` with a capacity of `1000` and one inserts a thousand-and-first key, the cache will forget its least recently used key-value pair in order not to overflow the allocated memory.

This structure is very useful to cache the result of costly operations when one cannot afford to keep every result in memory and only want to keep the most frequent ones.

For more information, you can check [this](<https://en.wikipedia.org/wiki/Cache_replacement_policies#Least_recently_used_(LRU)>) Wikipedia page.

```typescript
import { LRUCache } from "most-recent";
```

## Usage

The `LRUCache` takes a single argument to create: the desired capacity. You could also provide types for keys and values.

```typescript
const cache = new LRUCache(1000);
const stringCache = new LRUCache<string, string>(1000);
```

For available methods, please see [Mnemonist LRUCache documentation](https://yomguithereal.github.io/mnemonist/lru-cachehttps://yomguithereal.github.io/mnemonist/lru-cache)

The only difference from Mnemonist, is we emit an event (using [`nanoevents`](https://www.npmjs.com/package/nanoevents)) if an entry gets evicted.

```typescript
import { LRUCache } from "most-recent";
const cache = new LRUCache(1000);
cache.on("evicted", (key, value) => {
  console.log("evicted entry", key, value);
});
```
