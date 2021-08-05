import {Objects} from './Objects';
import {StringBuilder} from './StringBuilder';

export class StringUtil {

  // The minimum value of a Unicode supplementary code point, constant U+10000.
  static MIN_SUPPLEMENTARY_CODE_POINT = 0x10000;
  
  /**
	 * Tests if a string is blank: null, empty, or only whitespace (" ", \r\n, \t, etc)
	 * @param string string to test
	 * @return if string is blank
	 */
	static isBlank(string: string): boolean {
		if (Objects.isEmpty(string)) return true;
		else return !string.split('').some((str) => !StringUtil.isWhitespace(str.codePointAt(0)));
  }
  
  	/**
	 * Normalise the whitespace within this string; multiple spaces collapse to a single, and all whitespace characters
	 * (e.g. newline, tab) convert to a simple space
	 * @param string content to normalise
	 * @return normalised string
	 */
	static normaliseWhitespace(string: string): string {
		let accum = new StringBuilder();
		StringUtil.appendNormalisedWhitespace(accum, string, false);
		return accum.toString();
	}

	/**
	 * After normalizing the whitespace within a string, appends it to a string builder.
	 * @param accum builder to append to
	 * @param string string to normalize whitespace within
	 * @param stripLeading set to true if you wish to remove any leading whitespace
	 */
	static appendNormalisedWhitespace(accum: StringBuilder, string: string, stripLeading: boolean) {
		let lastWasWhite = false;
		let reachedNonWhite = false;
		let codePoint: number;

		for (let i = 0; i < string.length; i += StringUtil.charCount(codePoint)) {
			codePoint = string.codePointAt(i);

			//
			if (StringUtil.isActuallyWhitespace(codePoint)) {
				if ((stripLeading && !reachedNonWhite) || lastWasWhite) continue;
				else {
					accum.append(' ');
					lastWasWhite = true;
				}
			}

			//
			else if (!StringUtil.isInvisibleChar(codePoint)) {
				accum.appendCodePoint(codePoint);
				lastWasWhite = false;
				reachedNonWhite = true;
			}
		}
	}

	/**
	 * Tests if a code point is "whitespace" as defined in the HTML spec. Used for output HTML.
	 * @param char code point to test
	 * @return true if code point is whitespace, false otherwise
	 * @see #isActuallyWhitespace(int)
	 */
	static isWhitespace(codePoint: number) {
		let char = String.fromCodePoint(codePoint);
		return char === ' ' || char === '\t' || char === '\n' || char === '\f' || char === '\r';
	}

	/**
	 * Tests if a code point is "whitespace" as defined by what it looks like. Used for Element.text etc.
	 * @param codePoint code point to test
	 * @return true if code point is whitespace, false otherwise
	 */
	static isActuallyWhitespace(codePoint: number) {
		let char = String.fromCodePoint(codePoint);
		return char === ' ' || char === '\t' || char === '\n' || char === '\f' || char === '\r' || codePoint === 160;
	}

	static isInvisibleChar(codePoint: number): boolean {
		return codePoint === 8203 || codePoint === 173; // zero width sp, soft hyphen
		// previously also included zw non join, zw join - but removing those breaks semantic meaning of text
  }
  
  	/**
	 * Character.charCount(c)
	 */
	static charCount(codePoint: number): 1 | 2 {
		return codePoint >= StringUtil.MIN_SUPPLEMENTARY_CODE_POINT ? 2 : 1;
	}

	/**
	 * resolveUrl
	 * @param baseUri
	 * @param href
	 */
	static resolveUrl(baseUri: string, href: string) {
		return baseUri + '/' + href;
	}
}