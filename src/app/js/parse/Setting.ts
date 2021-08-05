import { Assert } from "../helper/Assert";
import { Objects } from "../helper/Objects";
import { Node } from "../nodes/1004_Node";
import { Attributes } from "../nodes/Attributes";
import { CoreCharset, Entities, EscapeMode } from "../nodes/Entities";

export class CharsetEncoder {
  canEncode(char: string): boolean {
    return true;
  }
}

export class OutputSetting {

  /**
	 * Get the output setting for this node,  or if this node has no document
	 * (or parent), retrieve the default output
	 * settings
	 */
	static forNode(node: Node): OutputSetting {
		let owner = node.getOwnerDocument() ;
		return owner?.outputSetting || OutputSetting.instance;
	}

  private _escapeMode: EscapeMode = EscapeMode.base;
  private _charset: string = "utf-8";
  private _coreCharset: CoreCharset; // fast encoders for ascii and utf8
  private _prettyPrint: boolean = true;
  private _outline: boolean = false;
  private _indentAmount: number = 1;
  private _syntax: "html" | "xml" = "html";

  static readonly instance = new OutputSetting();

  get escapeMode(): EscapeMode {
    return this._escapeMode;
  }

  set escapeMode(mode: EscapeMode) {
    this._escapeMode = mode;
  }

  get coreCharset(): CoreCharset {
    return this._coreCharset;
  }

  set coreCharset(charset: CoreCharset) {
    this._coreCharset = charset;
  }

  /**
   * Get the document's current output charset, which is used to control which characters are escaped when
   * generating HTML (via the <code>html()</code> methods), and which are kept intact.
   * <p>
   * Where possible (when parsing from a URL or File), the document's output charset is automatically set to the
   * input charset. Otherwise, it defaults to UTF-8.
   * @return the document's current charset.
   */
  get charset(): string {
    return this._charset;
  }

  /**
   * Update the document's output charset.
   * @param charset the new charset to use.
   * @return the document's output settings, for chaining
   */
  set charset(charset: string) {
    this._charset = charset;
  }

  // created at start of OuterHtmlVisitor so each pass has own encoder,
  // so OutputSettings can be shared among threads
  prepareEncoder(): CharsetEncoder {
    //CharsetEncoder encoder = charset.newEncoder();
    //encoderThreadLocal.set(encoder);
    this._coreCharset = Entities.getCoreCharsetByName(this.charset);
    return new CharsetEncoder();
  }

  get encoder(): CharsetEncoder {
    return this.prepareEncoder();
  }

  /**
   * Get the document's current output syntax.
   * @return current syntax
   */
  get syntax(): "html" | "xml" {
    return this._syntax;
  }

  /**
   * Set the document's output syntax. Either {@code html}, with empty tags and boolean attributes (etc), or
   * {@code xml}, with self-closing tags.
   * @param syntax serialization syntax
   * @return the document's output settings, for chaining
   */
  set syntax(syntax: "html" | "xml") {
    this._syntax = syntax;
  }

  /**
   * Get if pretty printing is enabled. Default is true. If disabled, the HTML output methods will not re-format
   * the output, and the output will generally look like the input.
   * @return if pretty printing is enabled.
   */
  get prettyPrint(): boolean {
    return this._prettyPrint;
  }

  /**
   * Enable or disable pretty printing.
   * @param pretty new pretty print setting
   * @return this, for chaining
   */
  set prettyPrint(pretty: boolean) {
    this._prettyPrint = pretty;
  }

  /**
   * Get if outline mode is enabled. Default is false. If enabled, the HTML output methods will consider
   * all tags as block.
   * @return if outline mode is enabled.
   */
  get outline(): boolean {
    return this._outline;
  }

  /**
   * Enable or disable HTML outline mode.
   * @param outlineMode new outline setting
   * @return this, for chaining
   */
  set outline(outlineMode: boolean) {
    this._outline = outlineMode;
  }

  /**
   * Get the current tag indent amount, used when pretty printing.
   * @return the current indent amount
   */
  get indentAmount(): number {
    return this._indentAmount;
  }

  /**
   * Set the indent amount for pretty printing
   * @param indentAmount number of spaces to use for indenting each level. Must be {@literal >=} 0.
   * @return this, for chaining
   */
  set indentAmount(indentAmount: number) {
    Assert.isTrue(indentAmount >= 0);
    this._indentAmount = indentAmount;
  }

  clone(): OutputSetting {
    return Object.create(this);
  }
}

export class ParseSetting {
  /**
   * HTML default settings: both tag and attribute names are lower-cased during parsing.
   */
  static readonly htmlDefault = new ParseSetting(false, false);

  /**
   * Preserve both tag and attribute case.
   */
  static readonly preserveCase = new ParseSetting(true, true);

  // preserve tag case
  readonly preserveTagCase: boolean;

  // preserve attribute name case
  readonly preserveAttributeCase: boolean;

  /**
   * Define parse settings.
   * @param tag preserve tag case?
   * @param attribute preserve attribute name case?
   */
  constructor(tag: boolean, attribute: boolean) {
    this.preserveTagCase = tag;
    this.preserveAttributeCase = attribute;
  }

  /**
   * Normalizes a tag name according to the case preservation setting.
   * @param {string} name attribute key
   * @return {string}
   */
  normalizeTag(name: string): string {
    name = Assert.notEmpty(name).trim();
    return !this.preserveTagCase ? name.toLowerCase() : name;
  }

  /**
   * Normalizes an attribute according to the case preservation setting.
   * @param {string} name attribute key
   * @return {string}
   */
  normalizeAttribute(name: string): string {
    name = Assert.notEmpty(name).trim();
    return !this.preserveAttributeCase ? name.toLowerCase() : name;
  }

  /**
   * normalizeAttributes
   */
  normalizeAttributes(attrs: Attributes): Attributes {
    if (Objects.notNull(attrs) && !this.preserveAttributeCase)
      attrs.normalize();
    return attrs;
  }
}
