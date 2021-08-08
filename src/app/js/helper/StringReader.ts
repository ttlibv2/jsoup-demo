import { Char } from "./Char";
import { Reader } from "./Reader";
import { Objects } from "./Objects";
import { Assert } from "./Assert";

export class StringReader extends Reader {
  private length: number = 0;
  private next: number = 0;
  private mark_: number = 0;

  /**
   * Creates a new string reader.
   * @param s  String providing the character stream.
   */
  constructor(private str: string) {
    super();
    this.length = str.length;
  }
  
  /** Check to make sure that the stream has not been closed */
  private ensureOpen(): void {
    if (Objects.isNull(this.str)) throw Error(`Stream closed`);
  }

  protected read_impl(cbuf?: Char[], offset?: number, len?: number): number {
	if(arguments.length === 0) {
      this.ensureOpen();
      if (this.next >= this.length) return -1;
      else return this.str.charCodeAt(this.next++);
    }
	else return this.readBuf(cbuf, offset, len);
  }

  protected readBuf(cbuf: Char[], offset: number=0, len: number=cbuf.length): number {
    this.ensureOpen();
	
    let invalidIndex = (): boolean => {
      if (offset < 0) return true;
      if (offset > cbuf.length) return true;
      if (len < 0) return true;
      if (offset + len > cbuf.length) return true;
      if (offset + len < 0) return true;
      else return false;
    };

    if (invalidIndex()) throw Error(`IndexOutOfBoundsException`);
    else if (len === 0) return 0;
    else if (this.next >= this.length) return -1;
    else {
      let n = Math.min(this.length - this.next, len);
      let str_copy = this.str.slice(this.next, this.next + n);
      let chars: Char[] = Char.string2Char(str_copy);
      cbuf.splice(offset, chars.length, ...chars);
      this.next += n;
      return n;
    }
  }

  skip(ns: number): number {
    this.ensureOpen();
    if(this.next >= this.length) return 0;
    let n = Math.min(this.length - this.next, ns);
    n = Math.max(-this.next,n);
    this.next+=n;
    return n;
  }

  ready(): boolean {
    this.ensureOpen();
    return true;
  }

  markSupported(): boolean {
    return true;
  }

  mark(readAheadLimit : number): void {
    Assert.isTrue(readAheadLimit >=0, `Read-ahead limit < 0`);
    this.ensureOpen();
    this.mark_ = this.next;
  }

  reset(): void {
    this.ensureOpen();
    this.next = this.mark_;
  }

  close(): void {
   this.str = null;
  }
}
