import { Objects } from "./Objects";
import {EqualsBuilder} from './EqualsBuilder';

export type ArrayPredicate<T> = (
  element: T,
  index: number,
  array: T[]
) => boolean;

export class ArrayList<T> extends Array<T> {
  //private arrayList: Array<T>;

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
  constructor(object?: number | T[]) {
    super(ArrayList.initLen(object));
    if(Array.isArray(object)) this.addAll(object);
  }

  private static initLen(object: any): number {
    if(Objects.isNumber(object)) return object;
    else if(Array.isArray(object)) return object.length;
    else return 0;
  }

  size(): number {
    return this.length;
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
    index = Objects.defaultIfNull(index, () => this.size());
    super.splice(index, 0, element);
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
    super.splice(index, 0, ...elements);
  }

  /**
   * Replaces the element at pos
   * @param {number} index
   * @param {<T>} element
   */
  set(index: number, element: T): T {
    let elOld = this.get(index);
    this[index] = element;
    return elOld;
  }

  /**
   * Copy to array from `[start, end - 1]`
   * @param {number=} start
   * @param {number=} end
   */
  slice(start?: number, end?: number): T[] {
    return super.slice(start, end);
  }

  /**
   * Removes all of the elements
   */
  clear(): void {
    super.splice(0);
  }

  /**
   * Returns true if this list contains the specified element.
   * @param {<T>} o
   */
  contains(o: T): boolean {
    return super.some((el: T) => this.objectEqual(el, o));
  }

  /**
   * Returns the element at
   * @param {number} index
   */
  get(index: number): T {
    return this[index] || null;
  }

  /**
   * Returns the index of the first elements
   * @param {<T>} object
   */
  indexOf(object: T): number {
    return this.findIndex((el: T) => this.objectEqual(el, object));
  }

  /**
   * Returns the index of the last elements
   * @param {<T>} object
   */
  lastIndexOf(object: T): number {
    let array = this.slice().reverse();
    let index = array.findIndex((el: T) => this.objectEqual(el, object));
    return index === -1 ? -1 : this.size() - index;
  }

  /**
   * Removes the element at pos
   * @param {number} index
   */
  removeAt(index: number): T;

  /**
   * Removes the element at pos
   * @param {number} index
   * @param {number=1} count
   */
  removeAt(index: number, count: number): T[];

  /**
   * @private
   * Removes the element at pos
   * @param {number} index
   * @param {number=1} count
   */
  removeAt(index: number, count?: number): any {
    let array = this.splice(index, count || 1);
    return Objects.isNull(count) ? array[0] : array;
  }

  /**
   * Removes the first occurrence of the specified element from this list
   * @param o
   */
  remove(o: T): number {
    let index = this.indexOf(o);
    if (index !== -1) this.splice(index, 1);
    return index;
  }

  /**
   * Removes the last element from an array and returns it.
   */
  removeLast(): T {
    return this.pop();
  }

  /**
   * Removes the first element from an array and returns it.
   */
  removeFirst(): T {
    return this.shift();
  }

  /**
   * Remove element list
   * @param {<T[]>} elements
   */
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

  /**
   * Remove element if predicate => true
   * @param predicate
   */
  removeIf(
    predicate: (value: T, index: number, array: T[]) => boolean
  ): boolean {
    let array = this.filter(predicate);
    return this.removeAll(array) > 0;
  }

  /**
   * Reverses the elements in an Array.
   * @param {boolean=false} createNew if true then reverse in new array
   * @return {ArrayList<T>}
   */
  reverseNew(createNew: boolean = false): ArrayList<T> {
    return createNew ? new ArrayList<T>(this.slice()) : this;
  }

  /**
   * Returns a section of an array.
   * @param {number=} fromIndex
   * @param {number=} toIndex
   */
  sublist(fromIndex?: number, toIndex?: number): T[] {
    if(Objects.notNull(toIndex)) toIndex += 1;
    return this.slice(fromIndex, toIndex);
  }

  /**
   * Adds all the elements of an array separated by the specified separator string.
   * @param {string=} separator
   * @param {(element: T) => any} callbackfn
   */
  join(separator?: string, callbackfn?: (element: T) => any): string {
    callbackfn = callbackfn || ((el) => el);
    return this.map((s: T) => callbackfn(s)).join(separator);
  }

  /**
   * Returns the index of the first element
   * @param predicate
   * @param thisArg
   */
  findIndex(predicate: ArrayPredicate<T>): number {
    return super.findIndex(predicate);
  }

  /**
   * Returns the value of the first element
   * @param predicate
   * @param thisArg
   */
  find(predicate: ArrayPredicate<T>): T {
    return super.find(predicate);
  }

  all(): this {
    return this;
  }

  toArray(): T[] {
    return [...this];
  }

  clone(): ArrayList<T> {
    return new ArrayList<T>(this.toArray());
  }

  private objectEqual(lhs: any, rhs: any): boolean {
    return EqualsBuilder.create().append(lhs, rhs).isEquals();
  }
}
