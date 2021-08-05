import { StringBuilder } from "../helper/StringBuilder";
import { Parser } from "../parse/Parser";
import { OutputSetting, ParseSetting } from "../parse/Setting";
import { Node } from "./1004_Node";
import { LeafNode } from "./1006_LeafNode";
import { Element } from "./Element";
import { XmlDeclaration } from "./XmlDeclaration";

/**
 * A comment node.
 */
export class Comment extends LeafNode {
  static is(node: Node): node is Comment {
    return node instanceof Comment;
  }
  constructor(data: string) {
    super();
    this.value = data;
  }

  getNodeName(): string {
    return "#comment";
  }

  /**
   * Get the contents of the comment.
   * @return comment content
   */
  getData(): string {
    return this.coreVal;
  }

  setData(data: string): this {
    this.coreVal = data;
    return this;
  }

  /**
   * Check if this comment looks like an XML Declaration.
   * @return true if it looks like, maybe, it's an XML Declaration.
   */
  isXmlDeclaration() {
    let data = this.getData();
    return Comment.isXmlDeclarationData(data);
  }

  outerHtmlHead( accum: StringBuilder, depth: number, setting: OutputSetting ): void {
    let pretty = setting.prettyPrint;
    let parent = this.parent();
    let isIf0 = () =>
      this.getSiblingIndex() === 0 &&
      Element.is(parent) &&
      parent.tag().formatAsBlock;

    if (pretty && isIf0() && setting.outline) {
      this.indent(accum, depth, setting);
      accum.append(`<!-- `).append(this.getData()).append(` -->`);
    }

    //
  }

  outerHtmlTail(
    accum: StringBuilder,
    depth: number,
    setting: OutputSetting
  ): void {}

  static isXmlDeclarationData(data: string): boolean {
    return data.length > 1 && (data.startsWith("!") || data.startsWith("?"));
  }

  /**
   * Attempt to cast this comment to an XML Declaration node.
   * @return an XML declaration if it could be parsed as one, null otherwise.
   */
  asXmlDeclaration(): any {
    let data = this.getData();

    //
    let declContent = data.substring(1, data.length - 1);
    if (Comment.isXmlDeclarationData(declContent)) return null;

    //
    let fragment = `<${declContent}>`;

    // use the HTML parser not XML, so we don't get into a recursive XML Declaration on contrived data
    let doc = Parser.htmlParser()
      .setting(ParseSetting.preserveCase)
      .parseDoc(fragment, this.getBaseUri());

    if (doc.body().children().size() === 0) return null;
    else {
      let el = doc.body().child(0);
      let decl = new XmlDeclaration(
        doc.parser().setting().normalizeTag(el.tagName()),
        data.startsWith("!")
      );

      decl.attributes().addAll(el.attributes());
      return decl;
    }
  }
}
