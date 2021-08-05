import { Assert } from "../helper/Assert";
import { Objects } from "../helper/Objects";
import { StringBuilder } from "../helper/StringBuilder";
import { ArrayList } from "../helper/ArrayList";
import { Attribute } from "./Attribute";
import { Document } from "./Document";
import { OutputSetting, ParseSetting } from "../parse/Setting";
import { Entities } from "./Entities";
import { EqualsBuilder } from "../helper/EqualsBuilder";

/**
 * The attributes of an Element.
 * Attribute name and value comparisons are generally <b>case sensitive</b>.
 * By default for HTML, attribute names are normalized to lower-case on parsing.
 * That means you should use lower-case strings when referring to attributes by name.
 */
export class Attributes extends ArrayList<Attribute> {
  static readonly dataPrefix: string = "data-";
  static readonly InternalPrefix: string = "/";

  /**
   * Returns the element at
   * @param index
   */
  get(index: number): Attribute;

  /**
   * Returns attribute without name
   * @param {string} name
   * @return {Attribute}
   */
  get(name: string): Attribute;

  /**
   * Get an attribute by case-insensitive key
   * @param key the attribute name
   * @return the first matching attribute
   */
  get(name: string, ignoreCase: boolean): Attribute;

  /** @private */
  get(object: string | number, ignoreCase?: boolean): Attribute {
    let index = Objects.isNumber(object)
      ? object
      : this.indexOf(object, ignoreCase);
    return super.get(index);
  }

  /**
   * Returns index by attribute
   * @param {Attribute} attr
   */
  indexOf(attr: Attribute): number;

  /**
   * Returns index by attribute name
   * @param {string} name
   * @param {boolean=false} ignoreCase if true then use equalsIgnoreCase()
   */
  indexOf(name: string, ignoreCase?: boolean): number;

  /** @private */
  indexOf(first: string | Attribute, ignoreCase?: boolean): number {
    if (first instanceof Attribute) return super.indexOf(first);
    else if (Objects.isString(first)) {
      let name: string = first;
      let applyEqual = (n1: string, n2: string) =>
        !!ignoreCase ? n1.toLowerCase() === n2.toLowerCase() : n1 === n2;
      return this.findIndex((attr) => applyEqual(attr.getName(), name));
    }
  }

  /**
   * Adds a new attribute.
   * @param {string} name
   * @param {string} value
   * @return {Attribute}
   */
  add(name: string, value: string): Attribute;

  /**
   * Adds a new attribute.
   * @param {Attribute} attribute
   */
  add(attribute: Attribute): void;

  /** @private */
  add(object: string | Attribute, value?: string): any {
    if (object instanceof Attribute) super.add(object);
    else {
      let attribute = new Attribute(object, value, this);
      super.add(attribute);
      return attribute;
    }
  }

  /**
   * @param {Iterable<Attribute>} attrs
   */
  addAll(attrs: Iterable<Attribute>): void {
    attrs = Assert.notNull(attrs);
    let array: Attribute[] = [...attrs].map((at) => at.setParent(this));
    super.addAll(array);
  }

  /**
   * Remove attribute at index
   * @param {number} index
   * @return {Attribute}
   */
  removeAt(index: number): Attribute {
    return super.removeAt(index, 1)?.setParent(null);
  }

  /**
   * Remove attribute
   * @param {Attribute} attr
   * @return {number}
   */
  remove(attr: Attribute): number;

  /**
   * Remove an attribute by name
   * @param {string} name attribute key to remove
   * @param {boolean=false} ignoreCase if true then remove with name is Case insensitive.
   */
  remove(name: string, ignoreCase?: boolean): Attribute;

  /** @private */
  remove(object: string | Attribute, ignoreCase?: boolean): any {
    // [Attribute]
    if (object instanceof Attribute) {
      let bool = this.contains(object);
      if (bool) super.remove(object.setParent(null));
    }

    // [string, boolean]
    else if (Objects.isString(object)) {
      let name: string = object;
      let index = this.indexOf(name, ignoreCase);
      return this.removeAt(index);
    }
  }

  /**
   * Set a new attribute, or replace an existing one by key.
   * @param name case sensitive attribute key (not null)
   * @param value attribute value (may be null, to set a boolean attribute)
   * @return these attributes, for chaining
   */
  set(name: string, value: string): this;

  /**
   * Set a new boolean attribute, remove attribute if value is false.
   * @param name case <b>insensitive</b> attribute key
   * @param value attribute value
   * @return these attributes, for chaining
   */
  set(name: string, value: boolean): this;

  /**
   * Set a new attribute, or replace an existing one by key.
   * @param attribute attribute with case sensitive key
   * @return these attributes, for chaining
   * */
  set(attribute: Attribute): this;

  /**
   * Replace new attribute
   * @param {number} index
   * @param {Attribute} attr
   * @return old attribute
   */
  set(index: number, attr: Attribute): any;

  /** @private */
  set(first: any, last?: any): this {
    //

    // [number, Attribute]
    if (Objects.isNumber(first) && last instanceof Attribute) {
      let index = first;
      let newAttr: Attribute = last.setParent(this);
      this.get(index)?.setParent(null);
      super.set(index, newAttr);
    }

    // [Attribute]
    else if (first instanceof Attribute) {
      let attr: Attribute = first.setParent(this);
      let index = this.indexOf(attr.getName());
      if (index !== -1) super.set(index, attr);
      else this.add(attr);
    }

    // [string, string]
    else if (Objects.isString(first) && Objects.isString(last)) {
      let name: string = first,
        value = last;
      let attr = this.get(name);
      if (attr !== null) attr.setValue(value);
      else this.add(name, value);
    }

    // [string, boolean]
    else if (Objects.isString(first) && Objects.isBoolean(last)) {
      let name = first,
        value: boolean = last;
      if (!value) this.remove(name);
      else this.putIgnoreCase(first, null);
    }

    return this;
  }

  /**
   * Set a new attribute
   * @param name case <b>insensitive</b> attribute key
   * @param value {string | boolean}
   */
  putIgnoreCase(name: string, value: string) {
    let attr = this.get(name, true);
    if (Objects.isNull(attr)) this.add(name, value);
    else {
      attr.setValue(value);
      attr.setName(name);
      return this;
    }
  }

  /**
   * Tests if these attributes contain an attribute with this key.
   * @param name case-sensitive key to check for
   * @param {boolean} ignoreCase
   * @return true if key exists, false otherwise
   */
  hasAttr(name: string, ignoreCase: boolean = false): boolean {
    return this.indexOf(name, ignoreCase) !== -1;
  }

  /**
   * Check if these attributes contain an attribute with a value for this key.
   * @param name key to check for
   * @return true if key exists, and it has a value
   */
  hasDeclaredValueForName(name: string): boolean {
    return Objects.notNull(this.get(name)?.getValue());
  }

  /**
   * Get the HTML representation of these attributes.
   * @return HTML
   */
  html(): string {
    let sb = new StringBuilder();
    let setting = new Document("").outputSetting;
    return this.htmlImpl(sb, setting).toString();
  }

  htmlImpl(accum: StringBuilder, setting: OutputSetting): StringBuilder {
    for (let i = 0; i < this.size(); i++) {
      let attr = this.get(i);
      if (Attributes.isInternalKey(attr.getName())) continue;

      // inlined from Attribute.html()
      let key = attr.getName();
      let val = attr.getValue();
      accum.append(" ").append(key);

      // collapse checked=null, checked="", checked=checked; write out others
      if (!Attribute.shouldCollapseAttribute(key, val, setting)) {
        accum.append('="');
        Entities.escapeImpl(
          accum,
          Objects.isNull(val) ? "" : val,
          setting,
          true,
          false,
          false
        );
        accum.append('"');
      }
    }

    return accum;
  }

  toString(): string {
    return this.html();
  }

  equals(o: any): boolean {
    return EqualsBuilder.withClass(this, o)
      .append(this.size(), o.size())
      .append(this, o)
      .isEquals();
  }

  /**
   * Internal method. Lowercases all keys.
   */
  normalize(): void {
    for (let attr of this) attr.normalize();
  }

  /**
   * Internal method. Removes duplicate attribute by name. Settings for case sensitivity of key names.
   * @param settings case sensitivity
   * @return number of removed dupes
   */
  deduplicate(setting: ParseSetting): number {
    if (this.isEmpty()) return 0;
    else {
      let preserve = setting.preserveAttributeCase;
      let dupes: number = 0;

      OUTER: for (let i = 0; i < this.size(); i++) {
        for (let j = i + 1; j < this.size(); j++) {
          let keyJ = this.get(j)?.getName();
          if (Objects.isNull(keyJ)) continue OUTER;
          else {
            let keyI = this.get(i)?.getName();
            if (
              (preserve && keyJ === keyI) ||
              (!preserve && keyJ.toLowerCase() === keyI.toLowerCase())
            ) {
              dupes++;
              this.removeAt(j);
              j--;
            }
          }
        }
      }
      return dupes;
    }
  }

  /**
   * Retrieves a filtered view of attributes that are HTML5 custom data attributes; that is, attributes with keys
   * starting with {@code data-}.
   * @return map of custom data attributes.
   */
  dataset(): Record<string, string> {
    throw new Error("Method not implemented.");
  }

  clone(): Attributes {
    return new Attributes(this.all());
  }

  /**
   * Returns attribute name startsWith `data-`
   * @param {string} key
   */
  static dataKey(key: string): string {
    return Attributes.dataPrefix + key;
  }

  static internalKey(key: string): string {
    return Attributes.InternalPrefix + key;
  }

  static isInternalKey(key: string): boolean {
    return Objects.notEmpty(key) && key.charAt(0) === Attributes.InternalPrefix;
  }
}
