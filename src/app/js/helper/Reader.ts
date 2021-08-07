import { Assert } from "./Assert";
import { Char } from "./Char";

export abstract class Reader {
  static readonly TRANSFER_BUFFER_SIZE: number = 8192;

  /** Maximum skip-buffer size */
  private static readonly maxSkipBufferSize: number = 8192;

  /** Skip buffer, null until allocated */
  private skipBuffer: Char[] = null;

  protected lock: any;

  constructor() {
    this.lock = this;
  }

  /**
   * Reads a single character.
   * @return     The character read, as an integer in the range 0 to 65535
   *             ({@code 0x00-0xffff}), or -1 if the end of the stream has
   *             been reached
   * @throws     IOException  If an I/O error occurs
   */
  read(): number;

  /**
   * Reads characters into an array.
   * @param       cbuf  Destination buffer
   * @return      The number of characters read, or -1 if the end of the stream has been reached
   * @throws      IOException  If an I/O error occurs
   */
  read(cbuf: Char[]): number;

  /**
   * Reads characters into a portion of an array
   * @param {Char[]} cbuf Destination buffer
   * @param {number=} offset Offset at which to start storing characters
   * @param {number=} len Maximum number of characters to read
   */
  read(cbuf: Char[], offset: number, len: number): number;

  /**
   * @private
   * @param {Char[]} cbuf Destination buffer
   * @param {number=} offset Offset at which to start storing characters
   * @param {number=} len Maximum number of characters to read
   */
  read(cbuf?: Char[], offset?: number, len?: number): number {
    return this.read_impl(cbuf, offset, len);
  }

  protected read_impl(cbuf?: Char[], offset?: number, len?: number): number {
    // read()
    if (arguments.length === 0) {
      let cb: Char[] = new Array(1);
      if (this.readBuf(cb, 0, 1) === -1) return -1;
      else return cb[0].num;
    }

    // read(cbuf)
    else if (arguments.length === 1) {
      return this.readBuf(cbuf, 0, cbuf.length);
    }

    //read(cbuf, offset, len)
    else if (arguments.length === 3) {
      return this.readBuf(cbuf, offset, len);
    }

    //
    else throw Error(`@arguments not support`);
  }

  /**
   * Reads characters into a portion of an array.  This method will block
   * until some input is available, an I/O error occurs, or the end of the
   * stream is reached.
   *
   * @param      cbuf  Destination buffer
   * @param      off   Offset at which to start storing characters
   * @param      len   Maximum number of characters to read
   *
   * @return     The number of characters read, or -1 if the end of the
   *             stream has been reached
   *
   * @throws     IOException  If an I/O error occurs
   * @throws     IndexOutOfBoundsException
   *             If {@code off} is negative, or {@code len} is negative,
   *             or {@code len} is greater than {@code cbuf.length - off}
   */
  protected abstract readBuf(cbuf: Char[], offset: number, len: number): number;

  /**
   * Skips characters.  This method will block until some characters are
   * available, an I/O error occurs, or the end of the stream is reached.
   * @param  n  The number of characters to skip
   * @return    The number of characters actually skipped
   * @throws     IllegalArgumentException  If {@code n} is negative.
   * @throws     IOException  If an I/O error occurs
   */
  skip(n: number): number {
    Assert.isTrue(n >= 0, `skip value is negative`);
    let nn = Math.min(n, Reader.maxSkipBufferSize);
    if (this.skipBuffer === null || this.skipBuffer.length < nn) {
      this.skipBuffer = new Array(nn);
    }

    // synchronized (lock)
    let r = n;
    while (r > 0) {
      let nc = this.read(this.skipBuffer, 0, Math.min(r, nn));
      if (nc === -1) break;
      else r -= nc;
    }

    return n - r;
  }

  /**
   * Tells whether this stream is ready to be read.
   *
   * @return True if the next read() is guaranteed not to block for input,
   * false otherwise.  Note that returning false does not guarantee that the
   * next read will block.
   *
   * @throws     IOException  If an I/O error occurs
   */
  ready(): boolean {
    return false;
  }

  /**
   * Tells whether this stream supports the mark() operation. The default
   * implementation always returns false. Subclasses should override this
   * method.
   *
   * @return true if and only if this stream supports the mark operation.
   */
  markSupported(): boolean {
    return false;
  }

  /**
   * Marks the present position in the stream.  Subsequent calls to reset()
   * will attempt to reposition the stream to this point.  Not all
   * character-input streams support the mark() operation.
   *
   * @param  readAheadLimit  Limit on the number of characters that may be
   *                         read while still preserving the mark.  After
   *                         reading this many characters, attempting to
   *                         reset the stream may fail.
   *
   * @throws     IOException  If the stream does not support mark(),
   *                          or if some other I/O error occurs
   */
  mark(readAheadLimit: number): void {
    throw Error(`mark() not supported`);
  }

  /**
   * Resets the stream.  If the stream has been marked, then attempt to
   * reposition it at the mark.  If the stream has not been marked, then
   * attempt to reset it in some way appropriate to the particular stream,
   * for example by repositioning it to its starting point.  Not all
   * character-input streams support the reset() operation, and some support
   * reset() without supporting mark().
   *
   * @throws     IOException  If the stream has not been marked,
   *                          or if the mark has been invalidated,
   *                          or if the stream does not support reset(),
   *                          or if some other I/O error occurs
   */
  reset(): void {
    throw Error(`reset() not supported`);
  }

  /**
   * Closes the stream and releases any system resources associated with
   * it.  Once the stream has been closed, further read(), ready(),
   * mark(), reset(), or skip() invocations will throw an IOException.
   * Closing a previously closed stream has no effect.
   *
   * @throws     IOException  If an I/O error occurs
   */
  abstract close(): void;
}
