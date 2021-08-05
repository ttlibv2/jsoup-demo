export class HashSet<T> extends Set<T> {
  toArray(): T[] {
    return [...this.values()];
  }
}
