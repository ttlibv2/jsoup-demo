import { Char } from '../helper/Char';
import { Reader } from '../helper/Reader';
import { StringReader } from '../helper/StringReader';
import { Objects } from '../helper/Objects';
import { Assert } from '../helper/Assert';

export class CharacterReader {
  static readonly EOF = Char.of(-1);
  static readonly maxStringCacheLen: number = 12;
  static readonly maxBufferLen: number = 1024 * 5; // visible for testing
  static readonly readAheadLimit: number = CharacterReader.maxBufferLen * 0.75;// visible for testing
  static readonly minReadAheadLen: number = 1024; // the minimum mark length supported. No HTML entities can be larger than this.
  static readonly stringCacheSize: number = 512;

  private charBuf: Char[];
  private reader: Reader;
  private bufLength: number;
  private bufSplitPoint: number;
  private bufPos: number = 0;
  private readerPos: number;
  private bufMark: number = -1;
  private stringCache: string[] = Array(CharacterReader.stringCacheSize); // holds reused strings in this doc, to lessen garbage

  constructor(input: Reader, sz: number);
  constructor(input: Reader);
  constructor(input: string);
  constructor(object: Reader | string, sz?: number) {

    let applyReader = (reader: Reader, sz: number) => {
      Assert.notNull(reader);
      Assert.isTrue(reader.markSupported());
      this.reader = reader;
      this.charBuf = Array(Math.min(sz, CharacterReader.maxBufferLen));
      this.bufferUp();
    };

    if (object instanceof Reader) {
      applyReader(object, sz || CharacterReader.maxBufferLen);
    }

    else {
      let reader = new StringReader(object);
      applyReader(reader, object.length);
    }
  }

  close(): void {
    if (Objects.notNull(this.reader)) {
      this.reader.close();
      this.reader = null;
      this.charBuf = null;
      this.stringCache = null;
    }
  }

  // if the underlying stream has been completely read, 
  // no value in further buffering
  private readFully: boolean = false;
  private strBuf: string = '';

  private bufferUp(): void {
    if (!!this.readFully || this.bufPos < this.bufSplitPoint) return;

    let isBufMark: boolean = this.bufMark !== -1;
    let pos: number = isBufMark ? this.bufMark : this.bufPos;
    let offset: number = isBufMark ? this.bufPos - this.bufMark : 0;
    let read: number = 0;

    try {
      let skipped = this.reader.skip(pos);
      this.reader.mark(CharacterReader.maxBufferLen);
      while (read <= CharacterReader.minReadAheadLen) {
        let thisRead = this.reader.read(this.charBuf, read, this.charBuf.length - read);
        if (thisRead === -1) this.readFully = true;
        if (thisRead <= 0) break;
        else read += thisRead;
      }

      this.reader.reset();
      if (read > 0) {
        // Previously asserted that there is room in buf to skip, so this will be a WTF
        Assert.isTrue(skipped === pos);
        this.bufLength = read;
        this.readerPos += pos;
        this.bufPos = offset;
        this.strBuf = this.charBuf.map(c => c.string).join('');
        if (this.bufMark !== -1) this.bufMark = 0;
        this.bufSplitPoint = Math.min(this.bufLength, CharacterReader.readAheadLimit);

      }
    } catch (error) {
      throw Error(`UncheckedIOException`);
    }

  }

  /**
   * Gets the current cursor position in the content.
   * @return current position
   */
  pos(): number {
    return this.readerPos + this.bufPos;
  }

  /**
   * Tests if all the content has been read.
   * @return true if nothing left to read.
   */
  isEmpty(): boolean {
    this.bufferUp();
    return this.bufPos >= this.bufLength;
  }

  private isEmptyNoBufferUp(): boolean {
    return this.bufPos >= this.bufLength;
  }

  private getAtPos(): Char {
    return this.charBuf[this.bufPos];
  }

  /**
   * Get the char at the current position.
   * @return {Char}
   */
  current(): Char {
    this.bufferUp();
    return this.isEmptyNoBufferUp() ? CharacterReader.EOF : this.getAtPos();
  }

  consume(): Char {
    this.bufferUp();
    let val = this.isEmptyNoBufferUp() ? CharacterReader.EOF : this.getAtPos();
    this.bufPos++;
    return val;
  }

  /**
   * Unconsume one character (bufPos--).
   * MUST only be called directly after a consume(), and no chance of a bufferUp.
   */
  unconsume(): void {
    if (this.bufPos < 1) throw new Error(`WTF: No buffer left to unconsume.`);
    else this.bufPos--;
  }

  /**
   * Moves the current position by one.
   */
  advance(): void {
    this.bufPos++;
  }

  mark() {

    //make sure there is enough look ahead capacity
    if (this.bufLength - this.bufPos < CharacterReader.minReadAheadLen) {
      this.bufSplitPoint = 0;
    }

    this.bufferUp();
    this.bufMark = this.bufPos;
  }

  unmark(): void {
    this.bufMark = -1;
  }

  rewindToMark(): void {
    if (this.bufMark === -1) throw new Error('Mark invalid');
    this.bufPos = this.bufMark;
    this.unmark();
  }

  /**
   * Returns the number of characters between the current position and the next instance of the input char
   * @param c scan target
   * @return offset between current position and next instance of target. -1 if not found.
   */
  nextIndexOf(c: Char | string): number {
    this.bufferUp();
    let str: string = c instanceof Char ? c.string : c;
    return this.strBuf.slice(this.bufPos).indexOf(str);

  }

  private sliceBuf(bufPos: number = this.bufPos): Char[] {
    return this.charBuf.slice(bufPos);
  }

  /**
   * Reads characters up to the specific char.
   * @param c the delimiter
   * @return the chars read
   */
  consumeTo(c: Char): string;
  consumeTo(string: string): string;
  /** @private */
  consumeTo(c: Char | string): string {
    let seq = c instanceof Char ? c.string : c;
		let offset = this.nextIndexOf(seq);
		if (offset !== -1) {
			let consumed = CharacterReader.cacheString(this.charBuf, this.stringCache, this.bufPos, offset);
			this.bufPos += offset;
			return consumed;
		}
		//
		else if (Char.isChar(c) || c.length === 1 || this.bufLength - this.bufPos < seq.length) {
			// nextIndexOf() did a bufferUp(), so if the buffer is shorter than the search string, we must be at EOF
			return this.consumeToEnd();
		}
		//
		else {
			// the string we're looking for may be straddling a buffer boundary, so keep (length - 1) characters
			// unread in case they contain the beginning of the search string
			let endPos = this.bufLength - seq.length + 1;
			let consumed = CharacterReader.cacheString(this.charBuf, this.stringCache, this.bufPos, endPos - this.bufPos);
			this.bufPos = endPos;
			return consumed;
		}

  }

  /**
   * Read characters until the first of any delimiters is found.
   * @param chars delimiters to scan for
   * @return characters read up to the matched delimiter.
   */
  consumeToAny(chars: string[]): string;
  consumeToAny(chars: Char[]): string;
  /** @private */
  consumeToAny(array: any[]): string {
    this.bufferUp();
    let index = this.sliceBuf().findIndex(ch => ch.in(array));
    return this.returnConsume(index);
  }

  // Java: Arrays.binarySearch()
  consumeToAnySorted(chars: Char[]): string {
    return this.consumeToAny(chars);
  }

  // &, <, null
  consumeData(): string {
    let chars = ['&', '<', '\u0000'];
    return this.consumeToAny(chars);
  }

  // & , ' , "
  consumeAttributeQuoted(single: boolean): string {
    return this.returnConsume(
      this.sliceBuf().findIndex((ch) => {
        if (ch.equals('&') || ch === Char.Default) return true;
        else if (ch.equals(`'`) && single) return true;
        else if (ch.equals(`"`) && !single) return true;
        else return false;
      }),
    );
  }

  // < | nullChar
  consumeRawData(): string {
    let index = this.sliceBuf().findIndex((ch) => ch.equals('<') || ch === Char.Default);
    return this.returnConsume(index);
  }

  // '\t', '\n', '\r', '\f', ' ', '/', '>'
  consumeTagName(): string {
    // NOTE: out of spec, added '<' to fix common author bugs; does not stop and append on nullChar but eats
    this.bufferUp();
    let array = ['\t', '\n', '\r', '\f', ' ', '/', '>', '<'];
    return this.returnConsume(this.sliceBuf().findIndex((ch) => ch.in(array)));
  }

  consumeToEnd(): string {
    this.bufferUp();
    let data = CharacterReader.cacheString(this.charBuf, this.stringCache, this.bufPos, this.bufLength - this.bufPos);
    this.bufPos = this.bufLength;
    return data;
  }

  consumeLetterSequence(): string {
    this.bufferUp();
    return this.returnConsume(this.sliceBuf().findIndex((ch) => !Objects.isLetter(ch.string)));
  }

  consumeDigitSequence(): string {
    this.bufferUp();
    return this.returnConsume(this.sliceBuf().findIndex((ch) => !Objects.isDigit(ch.string)));
  }

  consumeLetterThenDigitSequence(): string {
    this.bufferUp();
    let pos = this.bufPos;

    // letter
    let index = this.sliceBuf().findIndex((ch) => !Objects.isLetter(ch.string));
    this.bufPos += Math.max(index, 0);

    // digit
    if (!this.isEmptyNoBufferUp()) {
      let index = this.sliceBuf().findIndex((ch) => !Objects.isDigit(ch.string));
      this.bufPos += Math.max(index, 0);
    }

    return CharacterReader.cacheString(this.charBuf, this.stringCache, pos, this.bufPos - pos);
  }

  consumeHexSequence(): string {
    this.bufferUp();
    return this.returnConsume(this.sliceBuf().findIndex((ch) => !/^[0-9a-fA-F]/.test(ch.toString())));
  }

  matches(c: Char | string): boolean {
    if (Char.isChar(c)) return !this.isEmpty() && c.equals(this.getAtPos());
    else {
      this.bufferUp();
      let scanLength = c.length;
      if (scanLength > this.bufLength - this.bufPos) return false;
      else {
        let pos = this.bufPos;
        return !c.split('').some((ch, i) => !this.charBuf[pos + i].equals(ch));
      }
    }
  }

  matchesIgnoreCase(seq: string): boolean {
    this.bufferUp();
    let scanLength = seq.length;
    if (scanLength > this.bufLength - this.bufPos) return false;
    else return !seq.split('').some((ch, i) => !this.charBuf[this.bufPos + i].equals(ch));
  }

  matchesAny(seq: string[]): boolean;
  matchesAny(seq: Char[]): boolean;
  /** @private */
  matchesAny(array: Char[] | string[]): boolean {
    if (this.isEmpty()) return false;
    else {
      let seq: Char[] = array[0] instanceof Char ? <any>array : Char.of(<string[]>array);
      this.bufferUp();
      let c = this.getAtPos();
      return seq.some((ch) => ch.equals(c));
    }
  }

  matchesAnySorted(seq: Char[]): boolean {
    this.bufferUp();
    let str = this.getAtPos();
    return !this.isEmpty() && seq.some((ch) => ch.equals(str));
  }

  matchesLetter(): boolean {
    if (this.isEmpty()) return false;
    else return Objects.isLetter(this.getAtPos().string);
  }

  matchesDigit(): boolean {
    if (this.isEmpty()) return false;
    else return Objects.isDigit(this.getAtPos().string);
  }

  matchConsume(seq: string): boolean {
    if (this.matches(seq)) {
      this.bufPos += seq.length;
      return true;
    } else return false;
  }

  matchConsumeIgnoreCase(seq: string): boolean {
    if (this.matchesIgnoreCase(seq)) {
      this.bufPos += seq.length;
      return true;
    } else return false;
  }

  containsIgnoreCase(seq: string): boolean {
    // used to check presence of </title>, </style>. only finds consistent case.
    let loScan = seq.toLowerCase();
    let hiScan = seq.toUpperCase();
    return this.nextIndexOf(loScan) > -1 || this.nextIndexOf(hiScan) > -1;
  }

  toString(): string {
    if (this.bufLength - this.bufPos < 0) return '';
    else return this.charBuf.slice(this.bufPos, this.bufLength - this.bufPos).map(ch => ch.string).join('');
  }

  /**
   * Caches short strings, as a flyweight pattern, to reduce GC load. Just for this doc, to prevent leaks.
   * <p />
   * Simplistic, and on hash collisions just falls back to creating a new string, vs a full HashMap with Entry list.
   * That saves both having to create objects as hash keys, and running through the entry list, at the expense of
   * some more duplicates.
   */
  static cacheString(charBuf: Char[], stringCache: string[], start: number, count: number): string {
    // limit (no cache):
    if (count > CharacterReader.maxStringCacheLen) {
      let chars = charBuf.slice(start, start + count);
      return chars.map(ch => ch.string).join('');
    }
    else if (count < 1) return '';

    // calculate hash:
    let hash = Array(count)
      .fill(1)
      .map((_, i) => charBuf[start + i])
      .reduce((v, c) => 31 * v + c.num, 0);

    // get from cache
    let index = hash & (CharacterReader.stringCacheSize - 1);
    let cached = stringCache[index];

    if (cached != null && CharacterReader.rangeEquals(charBuf, start, count, cached))
      // positive hit
      return cached;
    else {
      //cached = charBuf.slice(start, count).join();
      let chars = charBuf.slice(start, start + count);
      cached = chars.map(ch => ch.string).join('');
      stringCache[index] = cached; // add or replace, assuming most recently used are most likely to recur next
      return cached;
    }
  }

  /**
   * Check if the value of the provided range equals the string.
   */
  static rangeEquals(charBuf: Char[], start: number, count: number, cached: string): boolean {
    if (count === cached.length) {
      let i = start;
      let j = 0;
      while (count-- !== 0) {
        if (!charBuf[i++].equals(cached.charAt(j++))) return false;
      }
      return true;
    }
    return false;
  }

  // just used for testing
  rangeEquals(start: number, count: number, cached: string): boolean {
    return CharacterReader.rangeEquals(this.charBuf, start, count, cached);
  }

  private returnConsume(index: number): string {
    index = index === -1 ? this.bufLength : index + this.bufPos;
    let start = this.bufPos;
    this.bufPos = index;
    return index > start ? CharacterReader.cacheString(this.charBuf, this.stringCache, start, index - start) : "";
  }


}