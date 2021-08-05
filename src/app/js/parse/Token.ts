import { Assert } from "../helper/Assert";
import { StringBuilder } from "../helper/StringBuilder";
import { Attributes } from "../nodes/Attributes";
import { Normalizer } from "../helper/Normalizer";
import { TokeniserState } from "./TokeniserState";
import { Tokeniser } from "./Tokeniser";
import { Objects } from "../helper/Objects";
import { Char } from "../helper/Char";

export enum TokenType {
  Doctype,
  StartTag,
  EndTag,
  Comment,
  Character, // note no CData - treated in builder as an extension of Character
  EOF
}

export abstract class Token {
  abstract get tokenType(): TokenType;

  /**
   * Reset the data represent by this token, for reuse. Prevents the need to create transfer objects for every
   * piece of data, which immediately get GCed.
   */
  abstract reset(): this;

  static reset(sb: StringBuilder) {
    if (Objects.notNull(sb)) sb.delete(0, sb.length);
  }

  isDoctype(): this is Doctype {
    return this.tokenType === TokenType.Doctype;
  }

  asDoctype(): Doctype {
    return <any>this;
  }

  isStartTag(): this is StartTag {
    return this.tokenType === TokenType.StartTag;
  }

  asStartTag(): StartTag {
    return <any>this;
  }

  isEndTag(): this is EndTag {
    return this.tokenType === TokenType.EndTag;
  }

  asEndTag(): EndTag {
    return <any>this;
  }

  isComment(): this is Comment {
    return this.tokenType === TokenType.Comment;
  }

  asComment(): Comment {
    return <any>this;
  }

  isCharacter(): this is Character {
    return this.tokenType === TokenType.Character;
  }

  /* eslint-disable */
  isCData(): this is CData {
    return this instanceof CData;
  }

  asCharacter(): Character {
    return <any>this;
  }

  isEOF(): this is EOF {
    return this.tokenType === TokenType.EOF;
  }
}

export class Doctype extends Token {
  pubSysKey = null;
  forceQuirks = false;
  name = new StringBuilder();
  publicIdentifier = new StringBuilder();
  systemIdentifier = new StringBuilder();

  get tokenType(): TokenType {
    return TokenType.Doctype;
  }

  getName(): string {
    return this.name.toString();
  }

  getPublicIdentifier(): string {
    return this.publicIdentifier.toString();
  }

  getSystemIdentifier(): string {
    return this.systemIdentifier.toString();
  }

  getPubSysKey(): string {
    return this.pubSysKey;
  }

  isForceQuirks(): boolean {
    return this.forceQuirks;
  }

  reset(): this {
    Doctype.reset(this.publicIdentifier);
    Doctype.reset(this.systemIdentifier);
    Token.reset(this.name);
    this.forceQuirks = false;
    this.pubSysKey = null;
    return this;
  }

  isDoctype(): boolean {
    return this.tokenType === TokenType.Doctype;
  }

  asDoctype(): Doctype {
    return <any>this;
  }

  isStartTag(): boolean {
    return this.tokenType === TokenType.StartTag;
  }

  asStartTag(): StartTag {
    return <any>this;
  }

  isEndTag(): boolean {
    return this.tokenType === TokenType.EndTag;
  }

  asEndTag(): EndTag {
    return <any>this;
  }

  isComment(): boolean {
    return this.tokenType === TokenType.Comment;
  }

  asComment(): Comment {
    return <any>this;
  }

  isCharacter(): boolean {
    return this.tokenType === TokenType.Character;
  }

  /* eslint-disable */
  isCData(): boolean {
    return <any>this instanceof CData;
  }

  asCharacter(): Character {
    return <any>this;
  }

  isEOF(): boolean {
    return this.tokenType === TokenType.EOF;
  }
}

export abstract class Tag extends Token {
  /**
   * Limits runaway crafted HTML from spewing attributes and getting a little sluggish in ensureCapacity.
   * Real-world HTML will P99 around 8 attributes, so plenty of headroom.
   * Implemented here and not in the Attributes object so that API users can add more if ever required.
   */
  private static readonly MaxAttributes = 512;

  protected tagName: string;
  protected normalName_: string; // lc version of tag name, for case insensitive tree build
  private pendingAttributeName: string; // attribute names are generally caught in one hop, not accumulated
  private pendingAttributeValue = new StringBuilder(); // but values are accumulated, from e.g. & in hrefs
  private pendingAttributeValueS: string; // try to get attr vals in one shot, vs Builder
  private hasEmptyAttributeValue: boolean = false; // distinguish boolean attribute from empty string value
  private hasPendingAttributeValue: boolean = false;
  selfClosing = false;

  // start tags get attributes on construction.
  // End tags get attributes on first new attribute
  // (but only for parser convenience, not used).
  attributes: Attributes;

  reset(): this {
    this.tagName = null;
    this.normalName_ = null;
    this.pendingAttributeName = null;
    this.pendingAttributeValueS = null;
    this.hasEmptyAttributeValue = false;
    this.hasPendingAttributeValue = false;
    this.selfClosing = false;
    this.attributes = null;
    Tag.reset(this.pendingAttributeValue);
    return this;
  }

  get_attr(name: string): string {
    return this.attributes?.get(name)?.getValue() || "";
  }

  newAttribute(): void {
    if (Objects.isNull(this.attributes)) {
      this.attributes = new Attributes();
    }

    if (
      this.pendingAttributeName != null &&
      this.attributes.size() < Tag.MaxAttributes
    ) {
      // the tokeniser has skipped whitespace control chars,
      // but trimming could collapse to empty for other control codes, so verify here
      this.pendingAttributeName = this.pendingAttributeName.trim();

      //
      if (this.pendingAttributeName.length > 0) {
        let value = this.hasPendingAttributeValue
          ? this.pendingAttributeValue.length > 0
            ? this.pendingAttributeValue.toString()
            : this.pendingAttributeValueS
          : this.hasEmptyAttributeValue
          ? ""
          : null;

        // note that we add, not put. So that the first is kept, and rest are deduped,
        // once in a context where case sensitivity is known (the appropriate tree builder).
        this.attributes.add(this.pendingAttributeName, value);
      }
    }
    this.pendingAttributeName = null;
    this.hasEmptyAttributeValue = false;
    this.hasPendingAttributeValue = false;
    Tag.reset(this.pendingAttributeValue);
    this.pendingAttributeValueS = null;
  }

  hasAttributes(): boolean {
    return Objects.notNull(this.attributes);
  }

  hasAttribute(key: string): boolean {
    return this.hasAttributes() && this.attributes.hasAttr(key);
  }

  // finalises for emit
  finaliseTag(): void {
    if (this.pendingAttributeName != null) {
      this.newAttribute();
    }
  }

  /**
   * preserves case, for input into Tag.valueOf (which may drop case)
   * @return {string}
   */
  name(): string {
    Assert.isFalse(Objects.isEmpty(this.tagName));
    return this.tagName;
  }

  normalName(): string {
    return this.normalName_;
  }

  toStringName(): string {
    return this.tagName || "[unset]";
  }

  set_tagName(name: string): Tag {
    this.tagName = name;
    this.normalName_ = Normalizer.lowerCase(name);
    return this;
  }

  isSelfClosing(): boolean {
    return this.selfClosing;
  }

  // these appenders are rarely hit in not null state-- caused by null chars.
  appendTagName(append: Char): void;
  appendTagName(append: string): void;
  /** @private */
  appendTagName(name: string | Char): void {
    let append: string = name instanceof Char ? name.string : name;
    // might have null chars - need to replace with null replacement character
    append = append.replace(
      TokeniserState.nullChar.string,
      Tokeniser.replacementChar.string
    );
    this.tagName = Objects.isNull(this.tagName)
      ? append
      : this.tagName.concat(append);
    this.normalName_ = Normalizer.lowerCase(this.tagName);
  }

  appendAttributeName(append: Char): void;
  appendAttributeName(append: string): void;
  /** @private */
  appendAttributeName(name: string | Char): void {
    let append: string = name instanceof Char ? name.string : name;
    // might have null chars because we eat in one pass - need to replace with null replacement character
    append = append.replace(
      TokeniserState.nullChar.string,
      Tokeniser.replacementChar.string
    );
    this.pendingAttributeName = Objects.isNull(this.pendingAttributeName)
      ? append
      : this.pendingAttributeName.concat(append);
  }

  appendAttributeValue(append: Char): void;
  appendAttributeValue(append: Char[]): void;
  appendAttributeValue(append: string): void;
  appendAttributeValue(append: string[]): void;
  appendAttributeValue(appendCodepoints: number[]): void;
  /** @private */
  appendAttributeValue(append: string | string[] | number[] | Char | Char[]): void {
    this.ensureAttributeValue();

    // [Char]
    if (append instanceof Char) {
      let str = append.string;
      if (this.pendingAttributeValue.isEmpty())  this.pendingAttributeValueS = str;
      else this.pendingAttributeValue.append(str);
		}
		
		// [string]
		else if (typeof append === "string") {
      if (this.pendingAttributeValue.length === 0)
        this.pendingAttributeValueS = append;
      else this.pendingAttributeValue.append(append);
		}

		else if(Array.isArray(append)) {
			let array:any[] = append;
			let first = append[0];

			 // [Char[]]
			 if (first instanceof Char) {
				let str = array.map((ch) => ch.string).join('');
				this.pendingAttributeValue.append(str);
			}

			// [string[]]
			else if (typeof first === "string") {
				this.pendingAttributeValue.append(array.join(''));
			}

			// [number[]]
			else if (typeof first === "number") {
				let charCode: number[] = <any>append;
				this.pendingAttributeValue.append(charCode.map(ch=>String.fromCharCode(ch)).join(''));
			}
		}
		
  }

  setEmptyAttributeValue() {
    this.hasEmptyAttributeValue = true;
  }

  private ensureAttributeValue(): void {
    this.hasPendingAttributeValue = true;
    if (this.pendingAttributeValueS != null) {
      this.pendingAttributeValue.append(this.pendingAttributeValueS);
      this.pendingAttributeValueS = null;
    }
  }

  abstract toString(): string;
}

export class StartTag extends Tag {
  get tokenType(): TokenType {
    return TokenType.StartTag;
  }

  reset(): this {
    super.reset();
    this.attributes = null;
    return this;
  }

  nameAttr(name: string, attributes: Attributes): this {
    this.tagName = name;
    this.attributes = attributes;
    this.normalName_ = Normalizer.lowerCase(name);
    return this;
  }

  toString(): string {
    let hasAttr = this.hasAttributes() && !this.attributes.isEmpty();
    let attr_list = this.attributes.toString();
    return `<${this.toStringName()}${hasAttr ? " " + attr_list : ""}>`;
  }
}

export class EndTag extends Tag {
  get tokenType(): TokenType {
    return TokenType.EndTag;
  }

  toString(): string {
    return `</${this.tagName}>`;
  }
}

export class Comment extends Token {
  data = new StringBuilder();
  dataS: string; // try to get in one shot
  bogus = false;

  get tokenType(): TokenType {
    return TokenType.Comment;
  }

  reset(): this {
    Comment.reset(this.data);
    this.dataS = null;
    this.bogus = false;
    return this;
  }

  getData() {
    return this.dataS || this.data.toString();
  }
  append(str: string): this;
  append(char: Char): this;
  /** @private */
  append(value: string | Char): this {
    let append: string = value instanceof Char ? value.string : value;
    this.ensureData();
    if (this.data.length === 0) this.dataS = append;
    else this.data.append(append);
    return this;
  }

  private ensureData() {
    // if on second hit, we'll need to move to the builder
    if (Objects.notNull(this.dataS)) {
      this.data.append(this.dataS);
      this.dataS = null;
    }
  }

  toString(): string {
    return `<!-- ${this.getData} -->`;
  }
}

export class Character extends Token {
  private _data: string;

  constructor(data: string = null) {
    super();
    this.data(data);
  }

  get tokenType(): TokenType {
    return TokenType.Character;
  }

  reset(): this {
    this._data = null;
    return this;
  }

  data(data: string): this {
    this._data = data;
    return this;
  }

  getData(): string {
    return this._data;
  }

  toString(): string {
    return this.getData();
  }
}

export class CData extends Character {
  toString(): string {
    return `<![CDATA[${this.getData()}]]>`;
  }
}

export class EOF extends Token {
  get tokenType(): TokenType {
    return TokenType.EOF;
  }

  reset(): this {
    return this;
  }

  toString() {
    return "";
  }
}
