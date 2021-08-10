import { HashMap } from "./HashMap";
import { Objects } from "./Objects";
import { Assert } from "./Assert";
const {isObject, entries, isPrimitive, isArray} = Objects;

export class ObjectMap extends HashMap<string, any> {

  static create(): ObjectMap {
    return new ObjectMap();
  }

  static of(object: any): ObjectMap {
    Assert.isTrue(isObject(object), `@object must be not object`);
    let newMap = new ObjectMap();
    for (let [key, value] of entries(object)) {
      if (isPrimitive(value)) newMap.set(key, value);
      else if (isArray(value)) newMap.set(key, value);
      else if (isObject(value)) newMap.set(key, ObjectMap.of(value))
    }

    return newMap;
  }

  static is(object: any): object is ObjectMap {
    return object instanceof ObjectMap;
  }

  //=============================

  get_map(key: string, value?: ObjectMap): ObjectMap {
    try {
      let arrayMap = this.get_maps(key);
      return arrayMap[0] || value;
    }
    catch (e) { return value; }
  }

  get_maps(key: string): ObjectMap[] {
    let mapValue = this.get(key);
    let arrayMap = Array.isArray(mapValue) ? mapValue : [mapValue];
    if(!ObjectMap.is(arrayMap[0]))throw Error(`@value of ${key} not is map.`);
    else return arrayMap;
  }

  clone(): ObjectMap {
    return Object.create(this);
  }
  
  toUrl(): string {
	return [...this.entries()].map(([k,v]) => `${k}=${v}`).join('&');
  }


}