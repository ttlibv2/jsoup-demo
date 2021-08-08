import { TextNode } from "./TextNode";
import { DataNode } from "./DataNode";
import { Comment } from "./Comment";
import { CDataNode } from "./CDataNode";
import { DocumentType } from "./DocumentType";
import { FormElement } from "./FormElement";
import { XmlDeclaration } from "./XmlDeclaration";
import { NodeType, Node } from "./1004_Node";
import { Element, PseudoText } from "./Element";
import { Document } from "./Document";
import { LeafNode } from "./1006_LeafNode";
import {Elements} from '../select/Elements';

export abstract class NodeUtils {
  private constructor(){}
  
   static isNode(node: any): node is Node {
		return node instanceof Node;
	}

  private static is(node: any, nodeTypes: string[]): boolean {
	  if(!NodeUtils.isNode(node)) return false;
	  else return nodeTypes.some(nt => NodeType[nt] === node['nodeType']);
  }

 

/** Node,

  Element,
   Form,
  PseudoText,
  Document,
  
  Text,
  Data,
  CData,
  Comment,
  ,
  DocumentType,
 
  Xml,
  Leaf */

  static isElement(node: any): node is Element {
    return NodeUtils.is(node, ['Element', 'Document', 'Form', 'PseudoText']);
  }

  static isTextNode(node: any): node is TextNode {
     return NodeUtils.is(node, ['CData', 'Text']);
  }

  static isDataNode(node: any): node is DataNode {
    return NodeUtils.is(node, ['Data']);
  }

  static isCDataNode(node: any): node is CDataNode {
    return NodeUtils.is(node, ['CData']);
  }

  static isDocument(node: any): node is Document {
    return NodeUtils.is(node, ['Document']);
  }

  static  isDocumentType(node: any): node is DocumentType {
    return NodeUtils.is(node, ['DocumentType']);
  }

  static isComment(node: any): node is Comment {
    return NodeUtils.is(node, ['Comment']);
  }

  static isFormElement(node: any): node is FormElement {
    return NodeUtils.is(node, ['Form']);
  }

  static isPseudoText(node: any): node is PseudoText {
    return NodeUtils.is(node, ['PseudoText']);
  }

  static isXmlDeclaration(node: any): node is XmlDeclaration {
    return NodeUtils.is(node, ['Xml']);
  }

  static isLeafNode(node: any): node is LeafNode {
    return NodeUtils.is(node, ['Leaf', 'Xml', 'Data', 'Comment', 'Text', 'DocumentType']);
  }
  
  static isElements(node: any): node is Elements {
    return node.constructor.name === 'Elements';
  }
}