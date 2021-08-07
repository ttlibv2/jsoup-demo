import { EqualsBuilder } from "../helper/EqualsBuilder";
import { Assert } from "../helper/Assert";
import { Normalizer } from "../helper/Normalizer";
import { Objects } from "../helper/Objects";
import { Attributes } from "./Attributes";
import { OutputSetting } from "../parse/Setting";

/**
 * A single key + value attribute.
 */
export class Attribute {
  /**
   * Create a new Attribute
   * @param {string=} name attribute key; case is preserved.
   * @param {string=} value attribute value (may be null)
   * @param {Attributes=} parent the containing Attributes
   */
  constructor(
    private name?: string,
    private value?: string,
    private parent?: Attributes
  ) {}

  /**
   * Get the attribute key.
   * @return {string}
   */
  getName(): string {
    return this.name;
  }

  /**
   * Set the attribute key; case is preserved.
   * @param {string} name the new key; must not be null
   */
  setName(name: string): this {
    Assert.notEmpty(name);
    this.name = name;
    return this;
  }

  /**
   * Get the attribute value.
   * @return {string}
   */
  getValue(): string {
    return this.value || "";
  }

  /**
   * Set the attribute value.
   * @param {string} value the new attribute value; must not be null
   */
  setValue(value: string): this {
    this.value = value || "";
    return this;
  }

  getParent(): Attributes {
    return this.parent;
  }

  setParent(parent: Attributes): this {
    this.parent = parent;
    return this;
  }

  isId(): boolean {
    return this.name === "id";
  }

  /**
   * Returns true if `name` begin prefix `data-`
   * @return {boolean}
   */
  isDataAttr(): boolean {
    return Attribute.isDataAttribute(this.name);
  }

  /**
   * Get the HTML representation of this attribute
   * @return html
   */
  html(): string {
    return `${this.name}='${this.value}'`;
  }

  /**
   * Get the string representation of this attribute
   * @return {string}
   */
  toString(): string {
    return this.html();
  }

  clone(): Attribute {
    return new Attribute(this.name, this.value, null);
  }

  normalize() {
    this.setName(Normalizer.lowerCase(this.getName()));
  }

  equals(o: any): boolean {
    return EqualsBuilder.withClass(this, o)
      .append(this.name, o.name)
      .append(this.value, o.value)
      .isEquals();
  }

  static shouldCollapseAttribute(
    key: string,
    val: string,
    setting: OutputSetting
  ): boolean {
    let iHtml = setting.syntax === "html";
    let isValKey = Objects.isEmpty(val) || Objects.equalsIgnoreCase(val, key);
    let isBool = Attribute.isBooleanAttribute(key);
    return iHtml && (Objects.isNull(val) || (isValKey && isBool));
  }

  static isDataAttribute(name: string): boolean {
    return (
      !!name &&
      name.startsWith(Attributes.dataPrefix) &&
      name.length > Attributes.dataPrefix.length
    );
  }

  static isBooleanAttribute(key: string): boolean {
    return Attribute.booleanAttributes.includes(key);
  }

  private static readonly booleanAttributes: string[] = [
    "allowfullscreen",
    "async",
    "autofocus",
    "checked",
    "compact",
    "declare",
    "default",
    "defer",
    "disabled",
    "formnovalidate",
    "hidden",
    "inert",
    "ismap",
    "itemscope",
    "multiple",
    "muted",
    "nohref",
    "noresize",
    "noshade",
    "novalidate",
    "nowrap",
    "open",
    "readonly",
    "required",
    "reversed",
    "seamless",
    "selected",
    "sortable",
    "truespeed",
    "typemustmatch"
  ];
}
