import { Objects } from "./Objects";

/*eslint-disable */
export type ArrayPredicate<T> = (element: T, index: number, array: T[]) => boolean;

export class ArrayList<T> implements Iterable<T> {
  private arrayList: Array<T>;

  /**
   * Constructs an empty 
   */
  constructor();

  /**
   * Constructs an empty list with the specified initial capacity.
   * @param {number} initialCapacity - the initial capacity of the list
   */
  constructor(initialCapacity: number);
  
  /**
   * Constructs a list containing the elements of the specified collection
   */
  constructor(array: T[]);

  /** private */
  constructor(object?: any) {
    let arrayLength = Objects.isNumber(object) ? object : Array.isArray(object) ? object.length : undefined;
    this.arrayList = new Array(arrayLength);
    if(Array.isArray(object)) this.arrayList.push(...object);
  }

  size(): number {
    return this.arrayList.length;
  }

  isEmpty(): boolean {
    return this.size() === 0;
  }

  /**
   * Inserts the specified element
   * @param element
   * @param index
   */
  add(element: T, index?: number): void {
    index = index || this.size();
    this.arrayList.splice(index, 0, element);
  }

  /**
   * Inserts all of the elements
   * @param elements
   * @param index
   */
  addAll(elements: Iterable<T>, index?: number): void;

  /**
   * Inserts all of the elements
   * @param elements
   * @param index
   */
  addAll(elements: T[], index?: number): void {
    index = index || this.size();
    this.arrayList.splice(index, 0, ...elements);
  }

  /**
   * Replaces the element at the specified position in this list with the specified element.
   * @param index 
   * @param element 
   */
  set(index: number, element: T): T {
    let elOld = this.get(index);
    this.arrayList[index] = element;
    return elOld;
  }

  /**
   * Removes all of the elements from this list (optional operation).
   */
  clear(): void {
    this.arrayList.splice(0);
  }

  /**
   * Returns true if this list contains the specified element.
   * @param o
   */
  contains(o: any): boolean {
    return this.arrayList.some((el) => this.objectEqual(el, o));
  }

  /**
   * Returns the element at
   * @param index
   */
  get(index: number): T {
    return this.arrayList[index];
  }

  /**
   * Returns the index of the first occurrence of the specified element in this list
   * @param o
   */
  indexOf(o: T): number {
    return this.arrayList.findIndex((el) => this.objectEqual(el, o));
  }

  /**
   * Returns the index of the last occurrence of the specified element in this list
   * @param o
   */
  lastIndexOf(o: T): number {
    let array = this.arrayList.slice().reverse();
    let index = array.findIndex((el) => this.objectEqual(el, o));
    return index === -1 ? -1 : this.size() - index;
  }

  /**
   * Removes the element at
   * @param {number} index
   * @param {number=1} count 
   */
  removeAt(index: number, count: number=1): T {
    return this.arrayList.splice(index, count)[0];
  }

  /**
   * Removes the first occurrence of the specified element from this list
   * @param o 
   */
  remove(o: T): number {
    let index = this.indexOf(o);
    if(index !==-1)this.arrayList.splice(index, 1);
    return index;
  }

  /**
   * Removes the last element from an array and returns it.
   */
  removeLast(): T {
    return this.arrayList.pop();
  }

  /**
   * Removes the first element from an array and returns it.
   */
  removeFirst(): T {
    return this.arrayList.shift();
  }

  removeAll(elements: T[]): number {
    let num = 0;
    for (let el of elements) {
      let index = this.indexOf(el);
      if (index !== -1) {
        this.removeAt(index);
        num++;
      }
    }
    return num;
  }

  removeIf(predicate: (value: T, index: number, array: T[]) => boolean): boolean {
    let array = this.arrayList.filter(predicate);
    return this.removeAll(array) > 0;
  }

  /**
   * Reverses the elements in an Array.
   * @param {boolean=false} createNew if true then reverse in new array
   * @return {ArrayList<T>}
   */
  reverse(createNew: boolean = false): ArrayList<T> {
   let array = createNew ? this.arrayList.slice() : this.arrayList;
   return createNew ? new ArrayList<T>(array) : this;
  }

  /**
   * Returns a section of an array.
   * @param {number=} fromIndex
   * @param {number=} toIndex
   */
  sublist(fromIndex?: number, toIndex?: number): T[] {
    return this.arrayList.slice(fromIndex, toIndex);
  }

  /**
   * Adds all the elements of an array separated by the specified separator string.
   * @param {string=} separator 
   * @param {(element: T) => any} callbackfn 
   */
  join(separator?: string, callbackfn?: (element: T)=> any): string {
    callbackfn = callbackfn || (el => el);
    return this.arrayList.map(s => callbackfn(s)).join(separator);
  }

  /**
   * Returns the index of the first element
   * @param predicate 
   * @param thisArg 
   */
  findIndex(predicate: ArrayPredicate<T>): number {
    return this.arrayList.findIndex(predicate);
  }

  /**
   * Returns the value of the first element
   * @param predicate 
   * @param thisArg 
   */
  find(predicate: ArrayPredicate<T>): T {
    return this.arrayList.find(predicate);
  }
  
  /**
   * Returns the this object after filling the section identified by start and end
   * @param {T} value 
   * @param {number=0} start 
   * @param {number=size()} end 
   */
  fill(value: T, start?: number, end?: number): this {
    this.arrayList.fill(value, start, end);
    return this;
  }

  /**
   * Returns the elements of an array that meet the condition specified in a callback function.
   * @param predicate 
   */
  some(predicate: ArrayPredicate<T>): boolean {
    return this.arrayList.some(predicate);
  }

  /**
   * Returns the elements of an array that meet the condition specified in a callback function.
   * @param callbackfn 
   */
  filter(callbackfn: ArrayPredicate<T>): T[] {
    return this.arrayList.filter(callbackfn);
  }

  /**
   * Calls a defined callback function on each element of an array
   * @param callbackfn 
   * @param thisArg 
   */
  map<U>(callbackfn: (value: T, index: number, array: T[]) => U):U[] {
    return this.arrayList.map(callbackfn);
  }

  /**
   * Performs the specified action for each element in an array.
   * @param callbackfn 
   * @param thisArg 
   */
  forEach(callbackfn: (value: T, index: number, array: T[]) => void): void {
    this.arrayList.forEach(callbackfn);
  }

  sort(compareFn?: (a: T, b: T) => number): this {
    this.arrayList.sort(compareFn);
    return this;
  }

  all(): T[] {
    return [...this.arrayList];
  }

  toArray(): T[] {
    return [...this.arrayList];
  }

  clone(): ArrayList<T> {
    return new ArrayList<T>(this.arrayList);
  }

  private objectEqual(lhs: any, rhs: any): boolean {
    if (lhs === rhs) return true;
    if (lhs === null || rhs === null) return false;
    if (lhs === undefined || rhs === undefined) return false;
    if (lhs.constructor !== rhs.constructor) return false;
    if ("equals" in lhs) return lhs.equals(rhs);
    if ("equals" in rhs) return rhs.equals(lhs);
    else return false;
  }

  // use for...of
  [Symbol.iterator](): Iterator<T> {
    return this.arrayList[Symbol.iterator]();
  }

}
