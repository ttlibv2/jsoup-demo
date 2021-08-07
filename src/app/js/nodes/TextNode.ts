import { Assert } from "../helper/Assert";
import { LeafNode } from "./1006_LeafNode";
import { StringBuilder } from "../helper/StringBuilder";
import { OutputSetting } from "../parse/Setting";
import { Element } from "./Element";
import { StringUtil } from "../helper/StringUtil";
import { Objects } from "../helper/Objects";
import { Entities } from "./Entities";
import { NodeType } from "./1004_Node";
import { Document } from "./Document";
import { NodeUtils } from "./NodeUtils";

/**
 * A text node.
 */
export class TextNode extends LeafNode {

  /**
   * Create a new TextNode representing the supplied (unencoded) text).
   * @param text raw text
   * @see #createFromEncoded(String)
   */
  constructor(text: string) {
		super();
		this.value = text;
  }

  get nodeType(): NodeType {
    return NodeType.Text;
  }

  /** @override */
  getNodeName(): string {
    return "#text";
  }

  /**
   * Get the text content of this text node.
   * @return Unencoded, normalised text.
   * @see TextNode#getWholeText()
   */
  text(): string;

  /**
   * Set the text content of this text node.
   * @param text unencoded text
   * @return this, for chaining
   */
  text(text: string): this;

  /** @private */
  text(text?: string): any {
    if (text === undefined) {
      return StringUtil.normaliseWhitespace(this.getWholeText());
    } else {
      this.coreVal = text;
      return this;
    }
  }

  /**
   * Get the (unencoded) text of this text node,
   * including any newlines and spaces present in the original.
   * @return text
   */
  getWholeText(): string {
    return this.coreVal;
  }

  /**
   * Test if this text node is blank -- that is, empty or only whitespace (including newlines).
   *  @return true if this document is empty or only whitespace
   */
  isBlank(): boolean {
    return Objects.isEmpty(this.coreVal);
  }

  /**
   * Split this text node into two nodes at the specified string offset. After splitting, this node will contain the
   * original text up to the offset, and will have a new text node sibling containing the text after the offset.
   * @param offset string offset point to split node at.
   * @return the newly created text node containing the text after the offset.
   */
  splitText(offset: number): TextNode {
    let text = this.coreVal;

    Assert.isTrue(offset >= 0, "Split offset must be not be negative");
    Assert.isTrue(
      offset < text.length,
      "Split offset must not be greater than current text length"
    );

    let head = text.substring(0, offset);
    let tail = text.substring(offset);

    // update text
    this.text(head);

    let tailNode = new TextNode(tail);
    if (this.hasParent()) {
      let index = this.getSiblingIndex() + 1;
      this.parent().addChildren([tailNode], index);
    }

    return tailNode;
  }

  /** @override */
  outerHtmlHead(
    accum: StringBuilder,
    depth: number,
    setting: OutputSetting
  ): void {
    let pretty = setting.prettyPrint;
    let parent = this.parent();
    let siblingIndex = this.getSiblingIndex();

    // if pretty === true
    let isIf0 = siblingIndex === 0 &&  NodeUtils.isElement(parent) &&  parent.tag().formatAsBlock && !this.isBlank();
    let isIf1 = setting.outline && this.siblingNodes().length > 0 && !this.isBlank();
    if (pretty && ( isIf0 || isIf1 ) ) this.indent(accum, depth, setting);

    //
    let normaliseWhite = pretty && !Element.preserveWhitespace(parent);
    let stripWhite = pretty && NodeUtils.isDocument(parent);
    Entities.escapeImpl( accum,  this.coreVal,  setting, false,  normaliseWhite, stripWhite   );
  }

  /** @override */
  outerHtmlTail(
    accum: StringBuilder,
    depth: number,
    setting: OutputSetting
  ): void {}

  /**
   * Create a new TextNode from HTML encoded (aka escaped) data.
   * @param encodedText Text containing encoded HTML (e.g. &amp;lt;)
   * @return TextNode containing unencoded data (e.g. &lt;)
   */
  static createFromEncoded(encodedText: string): TextNode {
    let text = Entities.unescape(encodedText);
    return new TextNode(text);
  }

  static normaliseWhitespace(text: string): string {
    return StringUtil.normaliseWhitespace(text);
  }

  static stripLeadingWhitespace(text: string): string {
    return text.trimLeft();
  }

  static lastCharIsWhitespace(sb: StringBuilder): boolean {
    return sb.length !== 0 && sb.charAt(sb.length - 1) === " ";
  }
}
