export class HashCode {

  static any(value: any): number {
    if(value === null || value === undefined) return 0;
    if(value instanceof Date) return HashCode.date(value);
    if(Array.isArray(value)) return HashCode.array(value);

    const type = typeof value;
    switch(type) {
      case 'string': return HashCode.string(value);
      case 'number': return HashCode.number(value);
      case 'boolean': return HashCode.boolean(value);
      case 'object': return HashCode.object(value);
      default: throw new Error(`${type} is not yet supported.`)
    }
  }

  static boolean(value: boolean): number {
    return HashCode.number(value ? 1 : 0);
  }

  static number(value: number): number {
    const buffer = new ArrayBuffer(8);
    const bufferAsF64 = new Float64Array(buffer);
    const bufferAsI32 = new Int32Array(buffer);
    if (~~value === value) return ~~value;
    else {
      bufferAsF64[0] = value;
      return bufferAsI32[0] ^ bufferAsI32[1];
    }
  }

  static string(value: string): number {
    return value
      .split('')
      .map((ch) => ch.charCodeAt(0))
      .reduce((hash, charCode) => ((hash << 5) - hash + charCode) | 0, 37);
  }

  static date(value: Date): number {
    const typeName = HashCode.string(value.constructor.name);
    const content = HashCode.number(value.valueOf());
    return HashCode.combine(typeName, content);
  }

  static array(value: any[]) {
    return HashCode.object(value);
  }

  static object(value: object): number {
    const typeName = HashCode.string(value.constructor.name);
    const entries = Object.entries(value).map(([k, v]) => HashCode.combine(HashCode.any(k), HashCode.any(v)));
    let codes = entries.length === 0 ? [0] : entries;
    return HashCode.combine(typeName,...codes);
  }

  static combine(...HashCodes: number[]) {
    if (HashCodes.length === 0)  return 0;
    else return HashCodes.reduce((a, b) => ((a << 5) + a) ^ b);
  }
}
