export abstract class Objects {

  private constructor() {}

  static isPrimitive(object: any): boolean {
    return (
      (typeof object !== "object" && typeof object !== "function") ||
      object === null
    );
  }

  static isIterable<T>(object: any): object is Iterable<T> {
    return typeof object[Symbol.iterator] === 'function';
  }

  static notEmpty(object: any): boolean {
    return !Objects.isEmpty(object);
  }

  static isEmpty(object: any): boolean {
    if (Objects.isNull(object)) return true;
    if (Array.isArray(object)) return object.length === 0;
    if (Objects.isString(object)) return object.trim().length === 0;
    if (Objects.isObject(object)) return Object.keys(object).length === 0;
    else return String(object).length === 0;
  }

  static isArray(object: any): object is any[] {
    return Array.isArray(object);
  }


  static isString(object: any): object is string {
    return typeof object === "string";
  }

  static isBoolean(object: any): object is boolean {
    return typeof object === "boolean";
  }

  static isObject(object: any): boolean {
    return Object.prototype.toString.call(object) === "[object Object]";
  }

  static isNumber(object: any): object is number{
		return typeof object === 'number';
	}

  static isNull(object: any): boolean {
    return object === null || object === undefined;
  }

  static notNull(object: any): boolean {
    return !Objects.isNull(object);
  }

  /**
   * Checks if all values in the array are not nulls.
   * @param values - the values to test, may be null or empty
   */
  static allNotNull(values: any[]): boolean {
    return Objects.notNull(values) && !values.some((vl) => Objects.isNull(vl));
  }

  /**
   * Checks if any value in the given array is not null.
   * @param values - the values to test, may be null or empty
   */
  static anyNotNull(values: any[]): boolean {
    return Objects.notNull(values) && values.some((vl) => Objects.notNull(vl));
  }

  /**
   * Checks if all values in the given array are null.
   * @param values - the values to test, may be null or empty
   */
  static allNull(values: any[]): boolean {
    return Objects.isNull(values) || !values.some((vl) => Objects.notNull(vl));
  }

  /**
   * Checks if any value in the given array is null.
   * @param values - the values to test, may be null or empty
   */
  static anyNull(values: any[]): boolean {
    return Objects.isNull(values) || values.some((vl) => Objects.isNull(vl));
  }

  /**
   * Returns a default value if the object passed is null.
   * @param object - the Object to test, may be null
   * @param defaultValue - the default value to return, may be null
   */
  static defaultIfNull<T>(object: T, defaultValue: T): T {
    return Objects.notNull(object) ? object : defaultValue;
  }

  static numberToHex(num: number): string {
    return num.toString(16);
  }

  static isLetterOrDigit(str: string): boolean {
    return /^[0-9a-zA-Z]+$/.test(str);
  }

  static isLetter(str: string): boolean {
    return /^[a-zA-Z]+$/.test(str);
  }

  static isDigit(str: string): boolean {
    return /^[0-9]+$/.test(str.toString());
  }

  /**
   * Tests that a String contains only ASCII characters.
   * @param string scanned string
   * @return true if all characters are in range 0 - 127
   */
  static isAscii(string: string): boolean {
    return !string.split("").some((str) => str.charCodeAt(0) > 127);
  }

  static equalsIgnoreCase(lhs: string, rhs: string): boolean {
    if (lhs === rhs) return true;
    else return (lhs || "").toLowerCase() === (rhs || "").toLowerCase();
  }

  // static objectEqual(lhs: any, rhs: any): boolean {
  //   return EqualsBuilder.withClass(lhs, rhs, ["*"]).isEquals();
  // }

  /**
   * Returns space padding (up to a max of 30).
   * @param width amount of padding desired
   * @return string of spaces * width
   */
  static padding(width: number): string {
    width = Math.min(Math.max(0, width), 30);
    return " ".repeat(width);
  }

  static in<T>(target: T, ...array: T[]): boolean {
    return (array || []).includes(target);
  }

  static inSorted(needle: string, haystack: string[]): boolean {
    return haystack.includes(needle);
  }
}
