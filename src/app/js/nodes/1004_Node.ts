import { Objects } from "../helper/Objects";
import { Assert } from "../helper/Assert";
import { StringBuilder } from "../helper/StringBuilder";
import { Parser } from "../parse/Parser";
import { OutputSetting } from "../parse/Setting";
import { NodeFilter } from "../select/NodeFilter";
import { NodeTraversor } from "../select/NodeTraversor";
import { NodeVisitorImpl } from "../select/NodeVisitor";
import { Attribute } from "./Attribute";
import { Attributes } from "./Attributes";
import { Document } from "./Document";
import { Element } from "./Element";
import { Elements } from "../select/Elements";
import { IObject } from "../helper/IObject";
import { StringUtil } from "../helper/StringUtil";
import { NodeList } from "./NodeList";

/**
 * The base, abstract Node model.
 * Elements, Documents, Comments etc are all Node instances.
 */
export abstract class Node implements IObject {

  static is(node: any): node is Node {
    return node instanceof Node;
  }

  private parentNode: Node;
  private siblingIndex: number;

  /**
   * Checks if this node has a parent.
   * @return {boolean}
   */
  hasParent(): boolean {
    return Objects.notNull(this.parentNode);
  }

  /**
   * Check if this Node has an actual Attributes object.
   * @return {boolean}
   */
  abstract hasAttributes(): boolean;

  /**
   * Get all of the element's attributes.
   * @return attributes (which implements iterable, in same order as presented in original HTML).
   */
  abstract attributes(): Attributes;

  /**
   * The name of this node, depending on its type
   * @return {string}
   */
  abstract getNodeName(): string;

  /**
   * Get the base URI that applies to this node.
   * Will return an empty string if not defined.
   * Used to make relative links absolute.
   */
  abstract getBaseUri(): string;

  /**
   * Set the baseUri for just this node (not its descendants), if this Node tracks base URIs.
   * @param baseUri new URI
   */
  protected abstract doSetBaseUri(baseUri: string): void;

  /**
   * Update the base URI of this node and all of its descendants.
   * @param baseUri base URI to set
   */
  setBaseUri(baseUri: string) {
    this.doSetBaseUri(Assert.notNull(baseUri));
  }

  /**
   * Get this node's root node
   * @return topmost ancestor.
   */
  root(): any {
    let node = this.parentNode;
    while (node !== null) node = node.parentNode;
    return node;
  }

  /**
   * The parent of this node
   * @return {Node}
   */
  parent(): Node {
    return this.parentNode;
  }

  getSiblingIndex() {
    return this.siblingIndex;
  }

  setSiblingIndex(index: number) {
    this.siblingIndex = index;
  }

  /**
   * Gets the Document associated with this Node.
   * @return the Document associated with this Node, or null if there is no such Document.
   */
  getOwnerDocument(): Document {
    let rootNode = this.root;
    return rootNode instanceof Document ? rootNode : null;
  }

  /**
   * Get an attribute's value by its key. <b>Case insensitive</b>
   * @param {string} name The attribute key.
   * @return {string} The attribute, or empty string if not present (to avoid nulls).
   */
  attr(name: string): string;

  /**
   * Set an attribute (key=value). If the attribute already exists, it is replaced.
   * @param {string} name The attribute key.
   * @param {string} value The attribute value.
   */
  attr(name: string, value: string | boolean | number): this;

  /**
   * Set an attribute (key=value). If the attribute already exists, it is replaced.
   * @param {Record<string, string | null>} attrs The object attribute
   */
  attr(attrs: Record<string, string | null>): this;

  /**
   * Set an attribute (key=value). If the attribute already exists, it is replaced.
   * @param {Record<string, string | null>} attrs The object attribute
   */
  attr(attr: Attribute): this;

  /**
   * @private
   */
  attr(name: string | Record<string, string | null> | Attribute, value?: string): any {
    // Set an attribute (key=value)
    if (value !== undefined && typeof name === "string") {
      return this.set_attr(name, value);
    }

    // Get an attribute
    else if (typeof name === "string") {
      return this.get_attr(name);
    }

    // Set an attribute (Attribute)
    else if (name instanceof Attribute) {
      let attr: Attribute = name;
      this.set_attr(attr.getName(), attr.getValue());
      return this;
    }

    // Set an attribute (Record<string, string | null>)
    else if (typeof name === "object") {
      let object: Record<string, string | null> = name;
      Object.keys(object).forEach((k) => this.set_attr(k, object[k]));
      return this;
    }
  }

  protected set_attr(name: string, value: string | number | boolean | null) {
    name = this.parser().setting().normalizeTag(name);
    if (typeof value === "boolean") this.attributes().set(name, value);
    else this.attributes().putIgnoreCase(name, `${value || ''}`);
    return this;
  }

  protected get_attr(name: string): string {
    name = Assert.notEmpty(name);
    if (!this.hasAttributes()) return "";
    else {
      let attrVal = this.attributes().get(name, true)?.getValue();
      if(Objects.notEmpty(attrVal)) return attrVal;
      else if(name.startsWith('abs:')) return this.absUrl(name.substring(4));
      else return '';
    }
  }

  /**
   * Test if this element has an attribute. <b>Case insensitive</b>
   * @param name The attribute key to check.
   * @return true if the attribute exists, false if not.
   */
  hasAttr(name: string): boolean {
    name = Assert.notEmpty(name);
    if (!this.hasAttributes()) return false;
    else {
      let isAbs = name.startsWith("abs:");
      let key = name.substring(4);
      let hasKey = this.attributes().hasAttr(name, true);
      return isAbs && hasKey && this.absUrl(key).length > 0 ? true : hasKey;
    }
  }

  /**
   * Remove an attribute from this node.
   * @param name The attribute to remove.
   * @return this (for chaining)
   */
  removeAttr(name: string): this {
    name = Assert.notEmpty(name);
    if (this.hasAttributes()) this.attributes().remove(name, true);
    return this;
  }

  /**
   * Clear (remove) all of the attributes in this node.
   * @return this, for chaining
   */
  clearAttributes(): this {
    this.attributes().clear();
    return this;
  }

  /**
   * Get an absolute URL from a URL attribute that may be relative (such as an <code>&lt;a href&gt;</code> or
   * <code>&lt;img src&gt;</code>).
   * <p>
   * E.g.: <code>String absUrl = linkEl.absUrl("href");</code>
   * */
  absUrl(name: string): string {
    name = Assert.notEmpty(name);
    let hasAttr =  this.hasAttributes() && this.attributes().hasAttr(name, true);
    if(!hasAttr) return '';
    else return StringUtil.resolveUrl(this.getBaseUri(), this.attributes().get(name, true).getValue());
  }

  /**
   * Get a child node by its 0-based index.
   * @param index index of child node
   * @return the child node at this index.
   */
  getChildNode(index: number): Node {
    return this.childNodes().get(index);
  }

  /**
   Get this node's children. Presented as an unmodifiable list: new children can not be added, but the child nodes
   themselves can be manipulated.
   @return list of children. If no children, returns an empty list.
   */
  abstract childNodes(): NodeList;

  getFirstChild(): Node {
    return this.childNodes().firstNode();
  }

  getLastChild(): Node {
    return this.childNodes().last();
  }

  /**
   * Returns a deep copy of this node's children. Changes made to these nodes will not be reflected in the original
   * nodes
   * @return a deep copy of this node's children
   */
  getChildNodesCopy(): NodeList {
    return this.childNodes().clone();
  }

  /**
   * Get the number of child nodes that this node holds.
   * @return the number of child nodes that this node holds.
   */
  childNodeSize(): number {
    return this.childNodes()?.size() || 0;
  }

  /**
   * Delete all this node's children.
   * @return this node, for chaining
   */
  abstract empty(): this;

  /**
   * Remove (delete) this node from the DOM tree.
   * If this node has children, they are also removed.
   */
  remove() {
    Assert.notNull(this.parentNode);
    this.parentNode?.removeChild(this);
  }

  /**
   * Insert the specified HTML into the DOM before this node (as a preceding sibling).
   * @param html HTML to add before this node
   * @return this node, for chaining
   * @see #after(String)
   */
  before(html: string): this;

  /**
   * Insert the specified node into the DOM before this node (as a preceding sibling).
   * @param node to add before this node
   * @return this node, for chaining
   * @see #after(Node)
   */
  before(node: Node): this;

  /**
   * @private
   */
  before(object: string | Node): this {
    Assert.notNull(object);
    if (typeof object === "string") {
      this.addSiblingHtml(this.siblingIndex, object);
    } else {
      Assert.notNull(this.parentNode);
      this.parentNode?.addChildren([object], this.siblingIndex);
    }
    return this;
  }

  /**
   * Insert the specified HTML into the DOM after this node (as a following sibling).
   * @param html HTML to add after this node
   * @return this node, for chaining
   * @see #before(String)
   */
  after(html: string): this;

  /**
   * Insert the specified node into the DOM after this node (as a following sibling).
   * @param node to add after this node
   * @return this node, for chaining
   * @see #before(Node)
   */
  after(node: Node): this;

  /**
   * @private
   */
  after(node: string | Node): this {
    Assert.notNull(node);
    let index = this.siblingIndex + 1;
    if (typeof node === "string") {
      this.addSiblingHtml(index, node);
    } else {
      Assert.notNull(this.parentNode);
      this.parentNode?.addChildren([node], index);
      
    }
    return this;
  }

  private addSiblingHtml(index: number, html: string) {
    Assert.notNull(html);
    Assert.notNull(this.parentNode);
    let context: any = this.parentNode instanceof Element ? this.parentNode : null;
    let nodes = this.parser().parseFragment(html,context,this.getBaseUri());
    this.parentNode?.addChildren(nodes, index);
    return this;
  }

  private getElementContext(): Element {
    if(Element.is(this.parentNode)) return this.parentNode;
    if(Element.is(this)) return this;
    else return null;
  }

  /**
   * Wrap the supplied HTML around this node.
   * @param {string} html HTML to wrap around this node
   */
  wrap(html: string): this {
    Assert.notEmpty(html);
    let context: Element = this.getElementContext();
    let wrapChild = this.parser().parseFragment(html, context, this.getBaseUri()) || [];
    let firstWrap:any = wrapChild[0];
    if (Element.is(firstWrap)) {
      let deepest = this.getDeepChild(firstWrap);

      if (Objects.notNull(this.parentNode)) {
        this.parentNode.replaceChild(this, firstWrap);
      }

      // side effect of tricking wrapChildren to lose first
      deepest.addChildren([this]);

      // remainder (unbalanced wrap, like <div></div><p></p> -- The <p> is remainder
      for(let remainder of wrapChild) {
        if (firstWrap === remainder) continue;
        let parent = remainder.parentNode;
        if(Objects.notNull(parent)) parent.removeChild(remainder);
        firstWrap.after(remainder);
      }
    }

    return this;
  }

  /**
   * Removes this node from the DOM, and moves its children up into the node's parent. This has the effect of dropping
   * the node but keeping its children.
   * @return the first child of this node
   */
  unwrap(): Node | null {
    Assert.notNull(this.parentNode);
    let childNodes = this.childNodes();
    let firstChild = childNodes.firstNode();
    this.parentNode?.addChildren(childNodes.all(), this.siblingIndex);
    this.remove();
    return firstChild;
  }

  private getDeepChild(el: Element): Element {
    let children: Elements = el.children();
    return children.size() > 0 ? this.getDeepChild(children.get(0)) : el;
  }

  // Element overrides this to clear its shadow children elements
  protected nodelistChanged() {
  }

  /**
   * Replace this node in the DOM with the supplied node.
   * @param in the node that will will replace the existing node.
   */
  replaceWith(node: Node) {
    Assert.notNull(node);
    Assert.notNull(this.parent());
    this.parent().replaceChild(this, node);
  }

  /**
   * Update parent for node
   * @param {Node} parent
   */
  protected setParentNode(parent: Node) {
    Assert.notNull(parent);
    if (this.hasParent()) this.parent().removeChild(this);
    this.parentNode = parent;
  }

  /**
   * Replace for node
   * @param {Node} nodeOut
   * @param {Node} nodeIn
   */
  replaceChild(nodeOut: Node, nodeIn: Node) {
    Assert.isTrue(nodeOut.parentNode === this);
    Assert.notNull(nodeIn);

    if (Objects.notNull(nodeIn.parentNode)) {
      nodeIn.parentNode.removeChild(nodeIn);
    }

    let index = nodeOut.siblingIndex;
    this.childNodes().set(index, nodeIn);
    nodeIn.parentNode = this;
    nodeIn.siblingIndex = index;
    nodeOut.parentNode = null;
  }

  /**
   * Remove child node
   * @param {Node} nodeOut
   */
  removeChild(nodeOut: Node) {
    Assert.isTrue(nodeOut.parentNode === this);
    let index = nodeOut.siblingIndex;
    this.childNodes().removeAt(index);
    this.reindexChildren(index);
    nodeOut.parentNode = null;
  }

  addChildren(iterable: Iterable<Node>, index?: number) {
    Assert.notNull(iterable);

    let children = [...iterable];

    // break if children empty
    if (children.length === 0) return;
    
    // index === undefined
    else if (index === undefined) {
      //most used. short circuit addChildren(int),
      // which hits reindex children and array copy
      let nodes = this.childNodes();
      for (let child of children) {
        this.reparentChild(child);
        nodes.add(child);
        child.setSiblingIndex(nodes.size() - 1);
      }
    }

    // index !== undefined
    else {
      let nodes = this.childNodes();

      // fast path - if used as a wrap (index=0, children = child[0].parent.children - do inplace
      let firstParent = children[0].parentNode;
      let isTrue = Objects.notNull(firstParent) && firstParent.childNodeSize() === children.length;
      if (isTrue) {
        let sameList = true;
        let firstParentNodes = firstParent.childNodes();

        let i = children.length;
        while (i-- > 0) {
          if (children[i] !== firstParentNodes[i]) {
            sameList = false;
            break;
          }
        }

        // moving, so OK to empty firstParent and short-circuit
        if (sameList) {
          firstParent.empty();
          nodes.addAll(children, index);
          i = children.length;
          while (i-- > 0) children[i].parentNode = this;
          this.reindexChildren(index);
          return;
        }
      }

      Assert.allNotNull(children);

      for (let child of children) {
        this.reparentChild(child);
      }

      nodes.addAll(children, index);
      this.reindexChildren(index);
    }
  }

  protected reparentChild(child: Node) {
    child.setParentNode(this);
  }

  protected reindexChildren(start: number) {
    let nodes = this.childNodes();
    for (let i = start; i < nodes.size(); i++) {
      nodes[i].siblingIndex = i;
    }
  }

  /**
   * Retrieves this node's sibling nodes.
   * @return node siblings. If the node has no parent, returns an empty list.
   */
  siblingNodes(): Node[] {
    if (Objects.isNull(this.parentNode)) return [];
    else {
      let nodes = this.parentNode.childNodes();
      return nodes.filter((node) => node !== this);
    }
  }

  /**
   * Get this node's next sibling.
   * @return next sibling, or @{code null} if this is the last sibling
   */
  nextSibling(): Node {
    if (Objects.notNull(this.parentNode)) {
      let siblings = this.parentNode.childNodes();
      let index = this.siblingIndex + 1;
      if (siblings.size() > index) return siblings[index];
    }
    return null;
  }

  /**
   * Get this node's previous sibling.
   * @return the previous sibling, or @{code null} if this is the first sibling
   */
  previousSibling(): Node | null {
    if(Objects.isNull(this.parentNode) || this.siblingIndex <=0 ) return null;
    else return this.parentNode.childNodes()[this.siblingIndex - 1];
  }

  /**
   * Perform a depth-first traversal through this node and its descendants.
   * @param {NodeVisitor} visitor the visitor callbacks to perform on each node
   * @return this node, for chaining
   */
  traverse(visitor: any): this {
    Assert.notNull(visitor);
    NodeTraversor.traverse(visitor, this);
    return this;
  }

  /**
   * Perform a depth-first filtering through this node and its descendants.
   * @param filter the filter callbacks to perform on each node
   * @return this node, for chaining
   */
  filter(filter: NodeFilter): this {
    Assert.notNull(filter);
    NodeTraversor.filter(filter, this);
    return this;
  }

  parser(): Parser {
    return Parser.forNode(this);
  }

  /**
   * Get the outer HTML of this node.
   * @return outer HTML
   */
  outerHtml(): string {
    let accum = new StringBuilder();
    this.outerHtmlImpl(accum);
    return accum.toString();
  }

  outerHtmlImpl(accum: StringBuilder): void {
    let setting = OutputSetting.forNode(this);
    NodeTraversor.traverse(new NodeVisitorImpl()
      .set_headCb((node, depth) => node.outerHtmlHead(accum, depth, setting))
      .set_tailCb((node, depth)=>node.outerHtmlTail(accum, depth, setting)), this);
  }

  /**
   * Write this node and its children
   * @param appendable the {@link Appendable} to write to.
   * @return the supplied {@link Appendable}, for chaining.
   */
  htmlImpl(appendable: StringBuilder) {
    this.outerHtmlImpl(appendable);
    return appendable;
	}

  /**
   * Create a stand-alone, deep copy of this node, and all of its children. 
   */
  clone(): Node {
    let thisClone = this.shallowClone();

    // Queue up nodes that need their children cloned (BFS).
    let nodesToProcess: Node[] = [thisClone];
    while (nodesToProcess.length > 0) {
      let currParent = nodesToProcess.pop();
      if(Objects.notNull(currParent)) {
        let childNodes = currParent.childNodes() || [];
        let length = currParent.childNodeSize() || 0;
        for (let i = 0; i < length; i++) {
          let childClone = childNodes[i].doClone(currParent);
          childNodes[i] = childClone;
          nodesToProcess.push(childClone);
        }
      }
    }

    return thisClone;
  }

  /**
   * Create a stand-alone, shallow copy of this node. None of its children (if any) will be cloned, and it will have
   * no parent or sibling nodes.
   * @return a single independent copy of this node
   * @see #clone()
   */
  shallowClone(): Node {
    return this.doClone();
  }

  /*
   * Return a clone of the node using the given parent (which can be null).
   * Not a deep copy of children.
   */
  protected doClone(parent?: Node): Node {
    let clone = Object.create(this);
    clone.parentNode = parent; // can be null, to create an orphan split
    clone.siblingIndex = parent == null ? 0 : this.siblingIndex;
    return clone;
  }

  protected indent(
    accum: StringBuilder,
    depth: number,
    setting: OutputSetting ) {
    accum.append("\n").append(Objects.padding(depth * setting.indentAmount));
  }

  equals(object: any): boolean {
    return this === object;
  }

  /**
   * outerHtmlHead
   * @param accum
   * @param depth
   * @param setting
   */
  abstract outerHtmlHead(accum: StringBuilder,depth: number,setting: OutputSetting): void;

  /**
   * outerHtmlTail
   * @param accum
   * @param depth
   * @param setting
   */
  abstract outerHtmlTail(accum: StringBuilder,depth: number,setting: OutputSetting ): void;
}
