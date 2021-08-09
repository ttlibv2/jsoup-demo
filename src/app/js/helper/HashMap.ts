import { ArrayList } from "./ArrayList";
import { EqualsBuilder } from "./EqualsBuilder";
import { IObject } from "./IObject";
import { Objects } from "./Objects";

export class MapEntry<K, V> implements IObject {
  //

  /**
   * Creates an entry representing a mapping from the specified
   * key to the specified value.
   *
   * @param key the key represented by this entry
   * @param value the value represented by this entry
   */
  constructor(private readonly key: K, private value: V) {}

  /**
   * Returns the key corresponding to this entry.
   * @return {K}
   */
  getKey(): K {
    return this.key;
  }

  /**
   * Returns the value corresponding to this entry.
   * @return {V}
   */
  getValue(): V {
    return this.value || null;
  }

  /**
   * Replaces the value corresponding to this entry with the specified
   * value.
   *
   * @param value new value to be stored in this entry
   * @return the old value corresponding to the entry
   */
  setValue(value: V): V {
    let oldValue = this.value;
    this.value = value;
    return oldValue || null;
  }

  equals(o: any): boolean {
    return EqualsBuilder.withClass(this, o, ["key", "value"]).isEquals();
  }
}

export class HashMap<K, V> extends Map<K, V> {
  
  private readonly mapKey = new ArrayList<K>();

  /**
   * @override
   * @param key 
   */
  delete(key: K): boolean {
    key = this.get_key_map_eq(key);
    this.mapKey.remove(key);
    return super.delete(key);
  }

  /**
   * @override
   * @param key 
   * @param value 
   */
  set(key: K, value: V): this {
    key = this.get_key_map_eq(key);
    return super.set(key, value);
  }

  /**
   * @override
   * @param key 
   */
  has(key: K): boolean {
    key = this.get_key_map_eq(key);
    return super.has(key);
  }

  /**
   * Returns true if this map contains no key-value mappings.
   * @return {boolean}
   */
  isEmpty(): boolean {
    return this.size === 0;
  }

  private equalsBuilder(lhs: any, rhs: any): EqualsBuilder {
    return EqualsBuilder.create().append(lhs, rhs, true);
  }

  /**
   * Returns true if this map maps one or more keys to the specified value
   * @param value - value whose presence in this map is to be tested
   * @return true if this map maps one or more keys to the specified value
   */
  containsValue(value: V): boolean {
    return [...this.values()].some((v) => this.equalsBuilder(v, value).isEquals());
  }

  /**
   * Returns true if this map contains a mapping for the specified key.
   * @param key - key whose presence in this map is to be tested
   * @return true if this map contains a mapping for the specified key
   */
  containsKey(key: K): boolean {
    return [...this.keys()].some((k) => this.equalsBuilder(k, key).isEquals());
  }

  private arrKey(): K[] {
    return [...this.keys()];
  }

  private get_key_map_eq(key: K): K {
    if(Objects.isPrimitive(key)) return key;
    else return this.arrKey().find(k => this.equalsBuilder(k, key).isEquals()) || null;
  }

  /**
   * @override
   * Returns the value to which the specified key is mapped
   * @param key - the key whose associated value is to be returned
   * @return the value to which the specified key is mapped
   */
  get(key: K): V {
    key = this.get_key_map_eq(key);
    return super.get(key) || null;
  }

  /**
   * Returns the value to which the specified key is mapped, or defaultValue if this map contains no mapping for the key.
   * @param key - the key whose associated value is to be returned
   * @param defaultValue - the default mapping of the key
   */
  getOrDefault(key: K, defaultValue: V): V {
    return this.get(key) || defaultValue;
  }

  /**
   * Associates the specified value with the specified key in this map
   * @param key - key with which the specified value is to be associated
   * @param value - value to be associated with the specified key
   */
  put(key: K, value: V): V {
    let oldValue = this.get(key);
    this.set(key, value);
    return oldValue || null;
  }

  /**
   * If the specified key is not already associated with a value
   * (or is mapped to null) associates it with the given value and returns null,
   * else returns the current value.
   * @param key - key with which the specified value is to be associated
   * @param value - value to be associated with the specified key
   */
  putIfAbsent(key: K, value: V): V {
    let oldValue = this.get(key);
    if (Objects.isNull(oldValue)) this.put(key, value);
    return oldValue || null;
  }

  /**
   * Removes the mapping for a key from this map if it is present
   * @param key - key whose mapping is to be removed from the map
   * @return the previous value associated with key, or null if there was no mapping for key.
   */
  remove(key: K): V;

  /**
   * Removes the entry for the specified key only if it is currently mapped to the specified value.
   * @param key - key with which the specified value is associated
   * @param value - value expected to be associated with the specified key
   */
  remove(key: K, value: V): V;

  /**
   * @private
   * @param key
   * @param value
   */
  remove(key: K, value: V = undefined): V {
    let oldValue = this.get(key);
    if (value === undefined || oldValue === value) this.delete(key);
    return oldValue || null;
  }

  /**
   * Copies all of the mappings from the specified map to this map
   * @param {Map<K, V>} map
   */
  putAll(map: Map<K, V>): this {
    for (let [k, v] of map) this.put(k, v);
    return this;
  }

  putEntries(entries: [K, V][]) {
    entries.forEach(([k, v]) => this.set(k, v));
    return this;
  }

  
  putAllIfAbsent(map: HashMap<K, V>): this {
    for(let [k,v] of map.entries()){
      this.putIfAbsent(k, v);
    }
    return this;
  }


  putObject(object: any, excludeField: string[]=[]): this {
    for(let [k, v] of Object.entries(object)) {
      if(excludeField.includes(k)) continue;
      else this.set(<any>k, <any>v);
    }
    return this;
  }

  // /**
  //  * Copies all of object
  //  * @param {Record<K, V>} object
  //  */
  // putAll(object: Record<K, V>): void;

  // /**
  //  * @private
  //  * @param {Map<K, V> | Record<K, V>} object
  //  * */
  // putAll(object: Map<K, V> | Record<K, V>): void {
  //   if (object instanceof Map) {
  //     for (let [k, v] of object) this.put(k, v);
  //   } else for (let k in object) this.put(k, object[k]);
  // }

  /**
   * Replaces the entry for the specified key only if it is currently mapped to some value.
   * @param key - key with which the specified value is associated
   * @param newValue - value to be associated with the specified key
   * @return the previous value associated with the specified key
   */
  replace(key: K, newValue: V): V;

  /**
   * Replaces the entry for the specified key only if currently mapped to the specified value.
   * @param key - key with which the specified value is associated
   * @param oldValue - value expected to be associated with the specified key
   * @param newValue - value to be associated with the specified key
   * @return true if the value was replaced
   */
  replace(key: K, oldValue: V, newValue: V): boolean;

  /**
   * @private
   */
  replace(key: K, arg1: V, arg2?: V): any {
    let oldValue = this.get(key) || null;

    // [key: K, newValue: V]
    if (arguments.length === 2) {
      this.set(key, arg1);
      return oldValue;
    }

    // [key: K, oldValue: V, newValue: V]
    else if (arguments.length === 3) {
      if (oldValue === arg1) this.set(key, arg2);
      return oldValue === arg1;
    }
  }

  /**
   * Replaces each entry's value with the result of invoking the given function 
   * on that entry until all entries have been processed or the function throws 
   * an exception. Exceptions thrown by the function are relayed to the caller.
   * @param functionCb - the function to apply to each entry
   */
  replaceAll(functionCb:(key:K, value:V) => V): void {
    for(let [k, v] of this) this.put(k, functionCb(k,v));
  }

  /**
   * If the specified key is not already associated with a value (or is mapped to null),
   * attempts to compute its value using the given mapping function and enters it into this map unless null.
   * Example: `map.computeIfAbsent(key, k -> new Value(f(k)));`
   * @param key - key with which the specified value is to be associated
   * @param mappingFunction - the function to compute a value
   */
  computeIfAbsent(key: K, mappingFunction: (key: K) => V): V {
    let value = this.get(key) || null;
    if (Objects.notNull(value)) return value;
    else {
      this.put(key, mappingFunction(key));
      return this.get(key) || null;
    }
  }

  /**
   * If the value for the specified key is present and non-null,
   * attempts to compute a new mapping given the key and its current mapped value.
   * <p>If the function returns null, the mapping is removed</p>
   * @param key - key with which the specified value is to be associated
   * @param remappingFunction - the function to compute a value
   * @return the new value associated with the specified key, or null if none
   */
  computeIfPresent(key: K, remappingFunction: (key: K, value: V) => V): V {
    let oldValue = this.get(key);
    if (Objects.isNull(oldValue)) return null;
    else {
      let newValue = remappingFunction(key, oldValue);
      if(Objects.isNull(newValue)) this.remove(key);
      else this.put(key, newValue);
      return newValue || null;
    }
  }

  /**
   * Attempts to compute a mapping for the specified key and
   * its current mapped value (or null if there is no current mapping).
   * For example, to either create or append a String msg to a value mapping:
   * `map.compute(key, (k, v) -> (v == null) ? msg : v.concat(msg))`
   * <p>If the function returns null, the mapping is removed</p>
   * @param key - key with which the specified value is to be associated
   * @param remappingFunction - the function to compute a value
   * @return the new value associated with the specified key, or null if none
   */
  compute(key: K, remappingFunction:(key:K, value:V)=>V): V {
    let newValue = remappingFunction(key, this.get(key));
    if(Objects.isNull(newValue)) this.remove(key);
    else this.put(key, newValue);
    return newValue || null;
  }

  /**
   * @override
   * Removes all of the mappings from this map
   */
  clear(): void {
    this.mapKey.clear();
    super.clear();
  }

  /**
   * Returns a Set view of the keys contained in this map
   * @return {IterableIterator<K>}
   */
  keys(): IterableIterator<K> {
    return super.keys();
  }

  /**
   * Returns a Set view of the values contained in this map
   * @return {IterableIterator<V>}
   */
  values(): IterableIterator<V> {
    return super.values();
  }

  /**
   * Returns an iterable of key, value pairs for every entry in the map.
   * @return {IterableIterator<[K, V]>}
   */
  entries(): IterableIterator<[K, V]> {
    return super.entries();
  }

  map<KN, VN>(callbackfn: (key: K, value: V) => [key: KN, value: VN]): HashMap<KN, VN> {
    let mapNew = new HashMap<KN, VN>();
    for(let [k,v] of this.entries()) {
      let cbFn = callbackfn(k, v);
      mapNew.set(cbFn[0], cbFn[1]);
    }
    return mapNew;
  }


  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void) {
    super.forEach(callbackfn);
  }

  clone(): HashMap<K, V> {
    return Object.create(this);
  }

  toJson(): Record<string, V> {
    return (<any>Object).fromEntries(this);
  }

}
