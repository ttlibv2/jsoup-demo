/*eslint-disable */
import { Assert } from "../helper/Assert";
import { Objects } from "../helper/Objects";
import { StringBuilder } from "../helper/StringBuilder";
import { StringUtil } from "../helper/StringUtil";
import { OutputSetting } from "../parse/Setting";
import { Node } from "./1004_Node";
import { LeafNode } from "./1006_LeafNode";

/**
 * A {@code <!DOCTYPE>} node.
 */
export class DocumentType extends LeafNode {
  static is(node: Node): node is DocumentType {
    return node instanceof DocumentType;
  }

  // static readonly PUBLIC_KEY = "PUBLIC";
  // static readonly SYSTEM_KEY = "SYSTEM";
  // static readonly NAME = "name";
  // static readonly PUB_SYS_KEY = "pubSysKey"; // PUBLIC or SYSTEM
  // static readonly PUBLIC_ID = "publicId";
  // static readonly SYSTEM_ID = "systemId";

  static get PUBLIC_KEY():string { return "PUBLIC";}
  static get SYSTEM_KEY():string { return "SYSTEM";}
  static get NAME():string { return "name";}
  static get PUB_SYS_KEY():string { return "pubSysKey"; }// PUBLIC or SYSTEM
  static get PUBLIC_ID():string { return "publicId";}
  static get SYSTEM_ID():string { return "systemId";}


  /**
   * Create a new doctype element.
   * @param name the doctype's name
   * @param publicId the doctype's public ID
   * @param systemId the doctype's system ID
   */
  constructor(name: string, publicId: string, systemId: string) {
    super();
    Assert.notNull(name);
    Assert.notNull(publicId);
    Assert.notNull(systemId);

    this.attr(DocumentType.NAME, name);
    this.attr(DocumentType.PUBLIC_ID, publicId);
    this.attr(DocumentType.SYSTEM_ID, systemId);
    this.updatePubSyskey();
  }

  setPubSysKey(value: string): this {
    if (Objects.notNull(value)) {
      this.attr(DocumentType.PUB_SYS_KEY, value);
    }
    return this;
  }

  /**
   * Get this doctype's name (when set, or empty string)
   * @return doctype name
   */
  name(): string {
    return this.attr(DocumentType.NAME);
  }

  /**
   * Get this doctype's Public ID (when set, or empty string)
   * @return doctype Public ID
   */
  publicId(): string {
    return this.attr(DocumentType.PUBLIC_ID);
  }

  /**
   * Get this doctype's System ID (when set, or empty string)
   * @return doctype System ID
   */
  systemId(): string {
    return this.attr(DocumentType.SYSTEM_ID);
  }

  getNodeName(): string {
    return "#doctype";
  }

  private updatePubSyskey() {
    // PUBLIC_ID
    if (this.hasPublicId()) {
      this.attr(DocumentType.PUB_SYS_KEY, DocumentType.PUBLIC_KEY);
    }
    // SYSTEM_ID
    else if (this.hasSystemId())
      this.attr(DocumentType.PUB_SYS_KEY, DocumentType.SYSTEM_KEY);
  }

  outerHtmlHead(
    accum: StringBuilder,
    depth: number,
    setting: OutputSetting
  ): void {
    //
    // looks like a html5 doctype, go lowercase for aesthetics
    let isHtml5 =
      setting.syntax === "html" && this.hasPublicId() && !this.hasSystemId();
    if (isHtml5) accum.append("<!DOCTYPE");
    else accum.append("<!doctype");

    if (this.hasName()) {
      accum.append(" ").append(this.attr(DocumentType.NAME));
    }

    // pubSysKey
    if (this.hasPubSysKey()) {
      accum.append(`' ${this.attr(DocumentType.PUB_SYS_KEY)}'`);
    }

    // publicId
    if (this.has(DocumentType.PUBLIC_ID)) {
      accum.append(`"${this.attr(DocumentType.PUBLIC_ID)}"`);
    }

    // systemId
    if (this.hasSystemId()) {
      accum.append(`"${this.attr(DocumentType.SYSTEM_ID)}"`);
    }

    accum.append(">");
  }

  outerHtmlTail(
    accum: StringBuilder,
    depth: number,
    setting: OutputSetting
  ): void {}

  private hasPublicId(): boolean {
    return this.has(DocumentType.PUBLIC_ID);
  }

  private hasSystemId(): boolean {
    return this.has(DocumentType.SYSTEM_ID);
  }

  private hasName(): boolean {
    return this.has(DocumentType.NAME);
  }

  private hasPubSysKey(): boolean {
    return this.has(DocumentType.PUB_SYS_KEY);
  }

  private has(attribute: string): boolean {
    return !StringUtil.isBlank(this.attr(attribute));
  }
}
