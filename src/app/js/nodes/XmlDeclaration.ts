import { Assert } from "../helper/Assert";
import { StringBuilder } from "../helper/StringBuilder";
import { OutputSetting } from "../parse/Setting";
import { Entities } from "./Entities";
import { LeafNode } from "./LeafNode";

export class XmlDeclaration extends LeafNode {
  /**
   * Create a new XML declaration
   * @param name of declaration
   * @param isProcessingInstruction is processing instruction
   */
  constructor(name: string, private readonly isProcessingInstruction: boolean) {
    super();
    this.value = Assert.notNull(name);
  }

  getNodeName(): string {
    return `#declaration`;
  }

  /**
   * Get the name of this declaration.
   * @return name of this declaration.
   */
  name(): string {
    return this.coreVal;
  }

  /**
   * Get the unencoded XML declaration.
   * @return XML declaration
   */
  getWholeDeclaration(): string {
    let sb = new StringBuilder();
    this.getWholeDeclarationImpl(sb, OutputSetting.instance);
    return sb.toString();
  }

  getWholeDeclarationImpl(sb: StringBuilder, setting: OutputSetting) {
    for (let attribute of this.attributes()) {
      let key = attribute.getName();
      let val = attribute.getValue();
      if (key !== this.getNodeName()) {
        sb.append(" ").append(key);
        if (val.length > 0) {
          sb.append(`="`);
          Entities.escapeImpl(sb, val, setting, true, false, false);
          sb.append(`"`);
        }
      }
    }
  }

  outerHtmlHead(
    accum: StringBuilder,
    depth: number,
    setting: OutputSetting
  ): void {
    accum
      .append("<")
      .append(this.isProcessingInstruction ? "!" : "?")
      .append(this.coreVal);

    this.getWholeDeclarationImpl(accum, setting);
    accum.append(this.isProcessingInstruction ? "!" : "?").append(">");
  }

  outerHtmlTail(
    accum: StringBuilder,
    depth: number,
    setting: OutputSetting
  ): void {}
}
