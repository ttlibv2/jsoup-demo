import { TextNode } from "./TextNode";
import { DataNode } from "./DataNode";
import { Comment } from "./Comment";
import { CDataNode } from "./CDataNode";
import { DocumentType } from "./DocumentType";
import { FormElement } from "./FormElement";
import { PseudoTextElement } from "./PseudoTextElement";
import { XmlDeclaration } from "./XmlDeclaration";
import { NodeType, Node } from "./1004_Node";
import { Element } from "./Element";
import { Document } from "./Document";
import { LeafNode } from "./1006_LeafNode";

export abstract class NodeUtils {
  private constructor(){}

  private static is(node: any, nodeType: NodeType): boolean {
    return 'nodeType' in node && node['nodeType'] === nodeType;
  }

  static isNode(node: any): node is Node {
    return NodeUtils.is(node, NodeType.Node);
  }

  static isElement(node: any): node is Element {
    return NodeUtils.is(node, NodeType.Element);
  }

  static isTextNode(node: any): node is TextNode {
    return NodeUtils.is(node, NodeType.Text);
  }

  static isDataNode(node: any): node is DataNode {
    return NodeUtils.is(node, NodeType.Data);
  }

  static isCDataNode(node: any): node is CDataNode {
    return NodeUtils.is(node, NodeType.CData);
  }

  static isDocument(node: any): node is Document {
    return NodeUtils.is(node, NodeType.Document);
  }

  static  isDocumentType(node: any): node is DocumentType {
    return NodeUtils.is(node, NodeType.DocumentType);
  }

  static isComment(node: any): node is Comment {
    return NodeUtils.is(node, NodeType.Comment);
  }

  static isFormElement(node: any): node is FormElement {
    return NodeUtils.is(node, NodeType.Form);
  }

  static isPseudoText(node: any): node is PseudoTextElement {
    return NodeUtils.is(node, NodeType.PseudoText);
  }

  static isXmlDeclaration(node: any): node is XmlDeclaration {
    return NodeUtils.is(node, NodeType.Xml);
  }

  static isLeafNode(node: any): node is LeafNode {
    return NodeUtils.is(node, NodeType.Leaf);
  }
}