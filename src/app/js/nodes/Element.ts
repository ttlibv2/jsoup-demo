import { Parser } from "../parse/Parser";
import { Tag } from "../parse/Tag";
import { Attributes } from "./Attributes";
import { Elements } from "../select/Elements";
import { Node } from "./1004_Node";
// import { TextNode } from "./TextNode";
// import { DataNode } from "./DataNode";
// import { Selector } from "../select/Selector";
// import { Collector } from "../select/Collector";
// import { QueryParser } from "../select/QueryParser";
import { StringBuilder } from "../helper/StringBuilder";
import { OutputSetting } from "../parse/Setting";
import { Assert } from "../helper/Assert";
import { NodeList } from "./NodeList";
import { Objects } from "../helper/Objects";
// import { Normalizer } from "../helper/Normalizer";
import { StringUtil } from "../helper/StringUtil";
// import { CDataNode } from "./CDataNode";
// import { NodeTraversor } from "../select/NodeTraversor";
// import { NodeVisitorImpl } from "../select/NodeVisitor";
import { Evaluator } from "../select/Evaluator";
import { TextNode } from "./TextNode";
// import * as EvaluatorNS from "../select/Evaluator";
// import { Document } from "./Document";

class WeakReference<T> {
  constructor(private value?: T) {}
  get(): T {
    return this.value;
  }
}

// type Evaluator = {[key: string]: any};

// declare let Selector: any; 
// declare let Collector: any;
// declare let QueryParser: any;
// declare let NodeTraversor: any;
// declare let NodeVisitorImpl: any;
// declare let EvaluatorNS: any;

/**
 * A HTML element consists of a tag name, attributes,
 * and child nodes (including text nodes and other elements).
 *
 * From an Element, you can extract data, traverse the node graph,
 * and manipulate the HTML.
 */
export class Element extends Node {
  static is(node: any): node is Element {
    return node instanceof Element;
  }

  static get BaseUriKey(): string { 
    return Attributes.internalKey("baseUri");
  }

  private nodeList: NodeList = new NodeList();

  private tagNode: Tag;

  // field is nullable but all methods for attributes are non null
  private attrs: Attributes;

  // points to child elements shadowed from node children
  private shadowChildrenRef: WeakReference<Element[]>;

  // setting output html
  //outputSetting: OutputSetting = new OutputSetting();

  /**
   * Create a new, standalone element.
   * @param {string} tag tag name
   */
  constructor(tagName: string);

  /**
   * Create a new, standalone element.
   * @param {Tag} tag tag of this element
   */
  constructor(tag: Tag);

  /**
   * Create a new, standalone Element.
   * @param tag tag of this element
   * @param baseUri the base URI
   */
  constructor(tag: Tag, baseUri: string);

  /**
   * Create a new, standalone Element.
   * @param tag tag of this element
   * @param baseUri the base URI
   * @param attributes initial attributes
   */
  constructor(tag: Tag, baseUri: string, attributes: Attributes);

  /**
   * @private
   * Create a new, standalone Element.
   * @param tag tag of this element
   * @param baseUri the base URI
   * @param attributes initial attributes
   */
  constructor(tag: Tag | string, baseUri?: string, attributes?: Attributes) {
    super();

    let tagObj = typeof tag === "string" ? Tag.valueOf(tag) : tag;
    this.tagNode = <any>Assert.notNull(tagObj);
    this.attrs = attributes || new Attributes();

    // set base uri if not null
    if (Objects.notNull(baseUri)) {
      this.setBaseUri(baseUri);
    }
  }

  /**
   * Check if a nodelist object has been created.
   * @return {boolean}
   */
  protected hasChildNodes(): boolean {
    return Objects.notEmpty(this.childNodes());
  }

  childNodes(): NodeList {
    return this.nodeList;
  }

  /**
   * Returns true if this node has any attributes
   * @return {boolean}
   */
  hasAttributes(): boolean {
    return Objects.notEmpty(this.attributes());
  }

  attributes(): Attributes {
    return this.attrs;
  }

  /**
   * The absolute base URI of this node or null
   * @return {string}
   */
  getBaseUri(): string {
    return Element.searchUpForAttribute(this, Element.BaseUriKey);
  }

  protected doSetBaseUri(baseUri: string): void {
    this.attributes().set(Element.BaseUriKey, baseUri);
  }

  /**
   * The name of this node, depending on its type
   * @return {string}
   */
  getNodeName(): string {
    return this.tag().tagName;
  }

  /**
   * Get the name of the tag for this element
   * @return the tag name
   */
  tagName(): string;

  /**
   * Change (rename) the tag of this element.
   * @param tagName new tag name for this element
   * @return this element, for chaining
   */
  tagName(name: string): this;

  /** @private */
  tagName(name?: string): any {
    if (name === undefined) return this.tagNode.tagName;
    else {
      Assert.notEmpty(name, "Tag name must not be empty.");
      this.tagNode = Tag.valueOf(name, this.parser().setting());
      return this;
    }
  }

  /**
   * Get the Tag for this element.
   * @return the tag object
   */
  tag(): Tag {
    return this.tagNode;
  }

  /**
   * Get the normalized name of this Element's tag.
   * @return normal name
   */
  normalName(): string {
    return this.tag().normalName;
  }

  /**
   * searchUpForAttribute
   * @param start
   * @param name
   */
  private static searchUpForAttribute(start: Element, name: string): string {
    let el = start;
    while (Objects.notNull(el)) {
      let attrs = el.attributes();
      let hasKey = Objects.notEmpty(attrs) && attrs.hasAttr(name);
      if (hasKey) return attrs.get(name).getValue();
      else el = el.parent();
    }
    return "";
  }

  /**
   * Returns parent node
   * @return {Element}
   */
  parent(): Element {
    return <any>super.parent();
  }

  /**
   * Test if this element is a block-level element.
   * @return true if block, false if not (and thus inline)
   */
  isBlock(): boolean {
    return this.tagNode.isBlock;
  }

  /**
   * Get the {@code id} attribute of this element.
   * @return The id attribute, if present, or an empty string if not.
   */
  id(): string;

  /**
   * Set the {@code id} attribute of this element.
   * @param id the ID value to use
   * @return this Element, for chaining
   * */
  id(id: string): this;

  /** @private */
  id(id?: string): any {
    if (id === undefined) return this.attributes().get("id", true);
    else {
      Assert.notNull(id);
      this.attr("id", id);
      return this;
    }
  }

  /**
   * Get this element's HTML5 custom data attributes.
   * @return a map of {@code key=value} custom data attributes.
   */
  dataset(): Record<string, string> {
    return this.attributes().dataset();
  }

  /**
   * Get this element's parent and ancestors, up to the document root.
   * @return this element's stack of parents, closest first.
   */
  parents(): Elements {
    let parents = new Elements();
    Element.accumulateParents(this, parents);
    return parents;
  }

  static accumulateParents(el: Element, parents: Elements) {
    let parent = el.parent();
    if (Objects.notNull(parent) && parent.tagName() !== "#root") {
      parents.add(parent);
      this.accumulateParents(parent, parents);
    }
  }

  /**
   * Get a child element of this element, by its 0-based index number.
   * <p>
   * Note that an element can have both mixed Nodes and Elements as children. This method inspects
   * a filtered list of children that are elements, and the index is based on that filtered list.
   * </p>
   *
   * @param index the index number of the element to retrieve
   * @return the child element, if it exists, otherwise throws an {@code IndexOutOfBoundsException}
   * @see #childNode(int)
   */
  child(index: number): Element {
    return this.childElementsList()[index];
  }

  /**
   * Get the number of child nodes of this element that are elements.
   * <p>
   * This method works on the same filtered list like {@link #child(int)}. Use {@link #childNodes()} and {@link
   * #childNodeSize()} to get the unfiltered Nodes (e.g. includes TextNodes etc.)
   * </p>
   *
   * @return the number of child nodes that are elements
   * @see #children()
   * @see #child(int)
   */
  childrenSize(): number {
    return this.childElementsList().length;
  }

  /**
   * Get this element's child elements.
   * <p>
   * This is effectively a filter on {@link #childNodes()} to get Element nodes.
   * </p>
   * @return child elements. If this element has no children, returns an empty list.
   * @see #childNodes()
   */
  children(): Elements {
    return new Elements(this.childElementsList());
  }

  /**
   * Maintains a shadow copy of this element's child elements. If the nodelist is changed, this cache is invalidated.
   * TODO - think about pulling this out as a Objects as there are other shadow lists (like in Attributes) kept around.
   * @return a list of child elements
   */
  childElementsList(): Element[] {
    if (this.childNodeSize() === 0) return [];
    else {
      let children: Element[] = this.shadowChildrenRef?.get() || null;
      let isRefNoNull = Objects.notNull(this.shadowChildrenRef);
      if (isRefNoNull && children !== null) return children;
      else {
        children = <any>(
          this.childNodes().filter((el) => Element.is(el))
        );
        this.shadowChildrenRef = new WeakReference(children);
        return children;
      }
    }
  }

  /**
   * Clears the cached shadow child elements.
   */
  nodelistChanged(): void {
    super.nodelistChanged();
    this.shadowChildrenRef = null;
  }

  /**
   * Get this element's child text nodes. The list is unmodifiable but the text nodes may be manipulated.
   * <p>
   * This is effectively a filter on {@link #childNodes()} to get Text nodes.
   * @return child text nodes. If this element has no text nodes, returns an
   * empty list.
   * </p>
   * For example, with the input HTML: {@code <p>One <span>Two</span> Three <br> Four</p>} with the {@code p} element selected:
   * <ul>
   *     <li>{@code p.text()} = {@code "One Two Three Four"}</li>
   *     <li>{@code p.ownText()} = {@code "One Three Four"}</li>
   *     <li>{@code p.children()} = {@code Elements[<span>, <br>]}</li>
   *     <li>{@code p.childNodes()} = {@code List<Node>["One ", <span>, " Three ", <br>, " Four"]}</li>
   *     <li>{@code p.textNodes()} = {@code List<TextNode>["One ", " Three ", " Four"]}</li>
   * </ul>
   */
  // textNodes(): TextNode[] {
  //   return <any[]>this.childNodes().filter((node) => node instanceof TextNode);
  // }

  /**
   * Get this element's child data nodes. The list is unmodifiable but the data nodes may be manipulated.
   * <p>
   * This is effectively a filter on {@link #childNodes()} to get Data nodes.
   * </p>
   * @return child data nodes. If this element has no data nodes, returns an
   * empty list.
   * @see #data()
   */
  // dataNodes(): DataNode[] {
  //   return <any[]>this.childNodes().filter((node) => node instanceof DataNode);
  // }

  /**
   * Find elements that match the {@link Selector} CSS query, with this element as the starting context. Matched elements
   * may include this element, or any of its children.
   * <p>This method is generally more powerful to use than the DOM-type {@code getElementBy*} methods, because
   * multiple filters can be combined, e.g.:</p>
   * <ul>
   * <li>{@code el.select("a[href]")} - finds links ({@code a} tags with {@code href} attributes)
   * <li>{@code el.select("a[href*=example.com]")} - finds links pointing to example.com (loosely)
   * </ul>
   * <p>See the query syntax documentation in {@link org.jsoup.select.Selector}.</p>
   * <p>Also known as {@code querySelectorAll()} in the Web DOM.</p>
   *
   * @param cssQuery a {@link Selector} CSS-like query
   * @return an {@link Elements} list containing elements that match the query (empty if none match)
   * @see Selector selector query syntax
   * @see QueryParser#parse(String)
   * @throws Selector.SelectorParseException (unchecked) on an invalid CSS query.
   */
  select(cssQuery: string): Elements;

  /**
   * Find elements that match the supplied Evaluator.
   * @param evaluator an element evaluator
   * @return an {@link Elements}
   */
  select(evaluator: Evaluator): Elements;

  /**
   * @private
   * @param {string | Evaluator} object
   */
  select(object: string | Evaluator): Elements {
    throw Error(`not impl`);
    //return Selector.select(<any>object, this);
  }

  /**
   * Find the first Element that matches the css query
   * @param cssQuery cssQuery a css query
   * @return the first matching element
   */
  selectFirst(cssQuery: string): Element;

  /**
   * Finds the first Element that matches the supplied Evaluator
   * @param evaluator an element evaluator
   * @return the first matching element
   */
  selectFirst(evaluator: Evaluator): Element;

  /**
   * @private
   * @param {string | Evaluator} object
   * @return {Element}
   */
  selectFirst(object: string | Evaluator): Element {
    throw Error(`not impl`);
    // let isCssQuery: boolean = typeof object === "string";
    // if (isCssQuery) return Selector.selectFirst(<string>object, this);
    // else return Collector.findFirst(<any>object, this);
  }

  /**
   * Checks if this element matches the given css query.
   * @param cssQuery a css query
   * @return if this element matches the query
   */
  is(cssQuery: string): boolean;

  /**
   * Check if this element matches the given evaluator.
   * @param evaluator an element evaluator
   * @return if this element matches
   */
  is(evaluator: Evaluator): boolean;

  /**
   * @private
   * @param {string | Evaluator} object
   * @return {Element}
   */
  is(object: string | Evaluator): boolean {throw Error(`not impl`);
    // let evaluator: Evaluator =
    //   typeof object === "string" ? QueryParser.parse(<any>object) : object;
    // return evaluator.matches(this.root(), this);
  }

  /**
   * Get this node's root node
   * @return topmost ancestor.
   */
  root(): Element {
    return super.root();
  }

  /**
   * Find the closest element up the tree of parents that matches the specified css query.
   * @param cssQuery a css query
   * @return the closest ancestor element
   */
  closest(cssQuery: string): Element;

  /**
   * Find the closest element up the tree of parents that matches the specified evaluator. Will return itself, an
   * ancestor, or {@code null} if there is no such matching element.
   * @param evaluator a query evaluator
   * @return the closest ancestor element (possibly itself) that matches the provided evaluator. {@code null} if not
   * found.
   */
  closest(evaluator: Evaluator): Element;

  /**
   * @private
   * @param {string | Evaluator} object
   * @return {Element}
   */
  closest(object: string | Evaluator): Element {throw Error(`not impl`);
    // let evaluator = Assert.notNull(
    //   typeof object === "string" ? QueryParser.parse(object) : object
    // );

    // let el: Element = this;
    // let root = this.root();
    // do {
    //   let isMatch = evaluator.matches(root, el);
    //   if (isMatch) return el;
    //   else el = el.parent();
    // } while (el != null);

    // //
    // return null;
  }

  /**
   * Insert a node to the end of this Element's children.
   * @param child node to add.
   * @return this Element, for chaining
   */
  appendChild(child: Node): this {
    Assert.notNull(child);
    this.reparentChild(child);
    this.childNodes();
    this.childNodes().add(child);
    child.setSiblingIndex(this.childNodeSize()- 1);
    return this;
  }

  /**
   * Insert the given nodes to the end of this Element's children.
   * @param children nodes to add
   * @return this Element, for chaining
   */
  appendChildren(children: Iterable<Node>): this {
    this.insertChildren(children, -1);
    return this;
  }

  /**
   * Add this element to the supplied parent element, as its next child.
   * @param parent element to which this element will be appended
   * @return this element, so that you can continue modifying the element
   */
  appendTo(parent: Element): this {
    Assert.notNull(parent);
    parent.appendChild(this);
    return this;
  }

  /**
   * Add a node to the start of this element's children.
   *
   * @param child node to add.
   * @return this element, so that you can add more child nodes or elements.
   */
  prependChild(child: Node): this {
    Assert.notNull(child);
    this.addChildren([child], 0);
    return this;
  }

  /**
   * Insert the given nodes to the start of this Element's children
   * @param children nodes to add
   * @return this Element, for chaining
   * @see #insertChildren(int, Collection)
   * */
  prependChildren(children: Node[]): this {
    this.insertChildren(children, 0);
    return this;
  }

  /**
   * Inserts the given child nodes into this element at the specified index. Current nodes will be shifted to the
   * right. The inserted nodes will be moved from their current parent. To prevent moving, copy the nodes first.
   * @param children child nodes to insert
   * @param index 0-based index to insert children at. Specify {@code 0} to insert at the start, {@code -1} at the end
   * @return this element, for chaining.
   */
  insertChildren(children: Iterable<Node>, index: number) {
    Assert.notNull(
      children,
      "Children collection to be inserted must not be null."
    );
    let currentSize = this.childNodeSize();

    if (index < 0) index += currentSize + 1; // roll around
    Assert.isTrue(
      index >= 0 && index <= currentSize,
      "Insert position out of bounds."
    );

    this.addChildren(children, index);
    return this;
  }

  /**
   * Create a new element by tag name, and add it as the last child.
   *
   * @param tagName the name of the tag (e.g. {@code div}).
   * @return the new element, to allow you to add content to it, 
   * @examp `parent.appendElement("h1")`.attr("id", "header").text("Welcome");
   */
  appendElement(tagName: string): Element {
    let setting = this.parser().setting();
    let tag = Tag.valueOf(tagName, setting);
    let child = new Element(tag, this.getBaseUri());
    this.appendChild(child);
    return child;
  }

  /**
   * Create a new element by tag name, and add it as the first child.
   *
   * @param tagName the name of the tag (e.g. {@code div}).
   * @return the new element, to allow you to add content to it
   * @examp `parent.prependElement("h1")`.attr("id", "header").text("Welcome");
   */
  prependElement(tagName: string): Element {
    let setting = this.parser().setting();
    let tag = Tag.valueOf(tagName, setting);
    let child = new Element(tag, this.getBaseUri());
    this.prependChild(child);
    return child;
  }

  /**
   * Create and append a new TextNode to this element.
   *
   * @param text the unencoded text to add
   * @return this element
   */
  appendText(text: string): this {throw Error(`not impl`);
    // Assert.notNull(text);
    // let node = new TextNode(text);
    // this.appendChild(node);
    // return this;
  }

  /**
   * Create and prepend a new TextNode to this element.
   *
   * @param text the unencoded text to add
   * @return this element
   */
  prependText(text: string): this {throw Error(`not impl`);
    // Assert.notNull(text);
    // let node = new TextNode(text);
    // this.prependChild(node);
    // return this;
  }

  /**
   * Add inner HTML to this element. The supplied HTML will be parsed, and each node appended to the end of the children.
   * @param html HTML to add inside this element, after the existing HTML
   * @return this element
   * @see #html(String)
   */
  append(html: string): this {
    Assert.notNull(html);
    let nodes = this.parser().parseFragment(html, this, this.getBaseUri());
    this.addChildren(nodes);
    return this;
  }

  /**
   * Add inner HTML into this element. The supplied HTML will be parsed, and each node prepended to the start of the element's children.
   * @param html HTML to add inside this element, before the existing HTML
   * @return this element
   * @see #html(String)
   */
  prepend(html: string): this {
    Assert.notNull(html);
    let nodes = this.parser().parseFragment(html, this, this.getBaseUri());
    this.addChildren(nodes, 0);
    return this;
  }

  /**
   * Remove all of the element's child nodes. Any attributes are left as-is.
   * @return this element
   */
  empty(): this {
    this.childNodes().clear();
    return this;
  }

  /**
   * Get a CSS selector that will uniquely select this element.
   * <p>
   * If the element has an ID, returns #id;
   * otherwise returns the parent (if any) CSS selector, followed by {@literal '>'},
   * followed by a unique selector for the element (tag.class.class:nth-child(n)).
   * </p>
   *
   * @return the CSS Path that can be used to retrieve the element in a selector.
   */
  cssSelector(): string {
    // prefer to return the ID - but check that it's actually unique first!
    if (this.id().length > 0) {
      let idSel = `#${this.id()}`;
      let doc = this.getOwnerDocument();
      if (Objects.isNull(doc)) return idSel;
      else {
        let els = doc.select(idSel);
        if (els.size() === 1 && els.get(0) === this) return idSel;
      }
    }

    // Translate HTML namespace ns:tag to CSS namespace syntax ns|tag
    //let tagName = this.tagName().replace(':', '|');
    let classes = [...this.classNames().values()].join(".");
    let selector = this.tagName().replace(":", "|");

    //
    if (classes.length > 0) {
      selector += `.${classes}`;
    }

    // parent null or is document
    let parent = this.parent();
    if (Objects.isNull(parent) || parent instanceof Document) {
      return selector;
    }

    //
    selector = ` > ${selector}`;
    if (parent.select(selector).size() > 1) {
      selector += `:nth-child(${this.elementSiblingIndex() + 1})`;
    }

    return parent.cssSelector() + selector;
  }

  /**
   * Get sibling elements. If the element has no sibling elements, returns an empty list. An element is not a sibling
   * of itself, so will not be included in the returned list.
   * @return sibling elements
   */
  siblingElements(): Elements {
    if (Objects.isNull(this.parent())) return new Elements();
    else {
      let elements = this.parent()
        .childElementsList()
        .filter((el) => el !== this);
      return new Elements(elements);
    }
  }

  /**
   * Gets the next sibling element of this element. E.g., if a {@code div} contains two {@code p}s,
   * the {@code nextElementSibling} of the first {@code p} is the second {@code p}.
   * <p>
   * This is similar to {@link #nextSibling()}, but specifically finds only Elements
   * </p>
   * @return the next element, or null if there is no next element
   * @see #previousElementSibling()
   */
  nextElementSibling(): Element {
    if (Objects.isNull(this.parent())) return null;
    else {
      let siblings = this.parent().childElementsList();
      let index = this.indexInList(this, siblings);
      return siblings.length > index + 1 ? siblings[index + 1] : null;
    }
  }

  /**
   * Get each of the sibling elements that come after this element.
   * @return each of the element siblings after this element, or an empty list if there are no next sibling elements
   */
  nextElementSiblings(): Elements {
    return this.nextElementSiblingsImpl(true);
  }

  /**
   * Gets the previous element sibling of this element.
   * @return the previous element, or null if there is no previous element
   * @see #nextElementSibling()
   */
  previousElementSibling(): Element {
    if (Objects.isNull(this.parent())) return null;
    else {
      let siblings = this.parent().childElementsList();
      let index = this.indexInList(this, siblings);
      return index > 0 ? siblings[index - 1] : null;
    }
  }

  /**
   * Get each of the element siblings before this element.
   *
   * @return the previous element siblings, or an empty list if there are none.
   */
  previousElementSiblings(): Elements {
    return this.nextElementSiblingsImpl(false);
  }

  private nextElementSiblingsImpl(next: boolean) {
    let els = new Elements();
    if (Objects.isNull(this.parent())) return els;
    else {
      els.add(this);
      return next ? els.nextAll() : els.prevAll();
    }
  }

  /**
   * Gets the first Element sibling of this element. That may be this element.
   * @return the first sibling that is an element (aka the parent's first element child)
   */
  firstElementSibling(): Element {
    let parent = this.parent();
    if (Objects.isNull(parent)) return this;
    else {
      let siblings = parent.childElementsList();
      return siblings.length > 1 ? siblings[0] : this;
    }
  }

  /**
   * Get the list index of this element in its element sibling list. I.e. if this is the first element
   * sibling, returns 0.
   * @return position in element sibling list
   */
  elementSiblingIndex(): number {
    let parent = this.parent();
    if (Objects.isNull(parent)) return 0;
    return this.indexInList(this, parent.childElementsList());
  }

  /**
   * Gets the last element sibling of this element. That may be this element.
   * @return the last sibling that is an element (aka the parent's last element child)
   */
  lastElementSibling(): Element {
    let parent = this.parent();
    if (Objects.isNull(parent)) return this;
    else {
      let siblings = parent.childElementsList();
      return siblings.length > 1 ? siblings[siblings.length - 1] : this;
    }
  }

  private indexInList<E extends Element>( search: Element, elements: E[] ): number {
    let index = elements.findIndex((el) => el === search);
    return Math.max(index, 0);
  }

  // DOM type methods

  //
  /**
   * Finds elements, including and recursively under this element, with the specified tag name.
   * @param tagName The tag name to search for (case insensitively).
   * @return a matching unmodifiable list of elements. Will be empty if this element and none of its children match.
   */
  getElementsByTag(tagName: string): Elements {throw Error(`not impl`);
    // Assert.notEmpty(tagName);
    // tagName = Normalizer.normalize(tagName);
    // return Collector.collect(new EvaluatorNS.Tag(tagName), this);
  }

  /**
   * Find an element by ID, including or under this element.
   * <p>
   * Note that this finds the first matching ID, starting with this element. If you search down from a different
   * starting point, it is possible to find a different element by ID. For unique element by ID within a Document,
   * use {@link Document#getElementById(String)}
   * @param id The ID to search for.
   * @return The first matching element by ID, starting with this element, or null if none found.
   */
  getElementById(id: string): Element {throw Error(`not impl`);
    // Assert.notEmpty(id);
    // let elements = Collector.collect(new EvaluatorNS.Id(id), this);
    // return elements?.get(0) || null;
  }

  /**
   * Find elements that have this class, including or under this element. Case insensitive.
   * <p>
   * Elements can have multiple classes (e.g. {@code <div class="header round first">}. This method
   * checks each class, so you can find the above with {@code el.getElementsByClass("header");}.
   *
   * @param className the name of the class to search for.
   * @return elements with the supplied class name, empty if none
   * @see #hasClass(String)
   * @see #classNames()
   */
  getElementsByClass(className: string): Elements {throw Error(`not impl`);
    // Assert.notEmpty(className);
    // return Collector.collect(new EvaluatorNS.Class(className), this);
  }

  /**
   * Find elements that have a named attribute set. Case insensitive.
   *
   * @param key name of the attribute, e.g. {@code href}
   * @return elements that have this attribute, empty if none
   */
  getElementsByAttribute(key: string): Elements {throw Error(`not impl`);
    // key = Assert.notEmpty(key).trim();
    // return Collector.collect(new EvaluatorNS.Attribute(key), this);
  }

  /**
   * Find elements that have an attribute name starting with the supplied prefix. Use {@code data-} to find elements
   * that have HTML5 datasets.
   * @param keyPrefix name prefix of the attribute e.g. {@code data-}
   * @return elements that have attribute names that start with with the prefix, empty if none.
   */
  getElementsByAttributeStarting(keyPrefix: string): Elements {throw Error(`not impl`);
    // keyPrefix = Assert.notEmpty(keyPrefix).trim();
    // return Collector.collect(
    //   new EvaluatorNS.AttributeStarting(keyPrefix),
    //   this
    // );
  }

  /**
   * Find elements that have an attribute with the specific value. Case insensitive.
   *
   * @param key name of the attribute
   * @param value value of the attribute
   * @return elements that have this attribute with this value, empty if none
   */
  getElementsByAttributeValue(key: string, value: string): Elements {throw Error(`not impl`);
    // return Collector.collect(
    //   new EvaluatorNS.AttributeWithValue(key, value),
    //   this
    // );
  }

  /**
   * Find elements that either do not have this attribute, or have it with a different value. Case insensitive.
   *
   * @param key name of the attribute
   * @param value value of the attribute
   * @return elements that do not have a matching attribute
   */
  getElementsByAttributeValueNot(key: string, value: string): Elements {throw Error(`not impl`);
    // return Collector.collect(
    //   new EvaluatorNS.AttributeWithValueNot(key, value),
    //   this
    // );
  }

  /**
   * Find elements that have attributes that start with the value prefix. Case insensitive.
   *
   * @param key name of the attribute
   * @param valuePrefix start of attribute value
   * @return elements that have attributes that start with the value prefix
   */
  getElementsByAttributeValueStarting(key: string, value: string): Elements {throw Error(`not impl`);
    // return Collector.collect(
    //   new EvaluatorNS.AttributeWithValueStarting(key, value),
    //   this
    // );
  }

  /**
   * Find elements that have attributes that end with the value suffix. Case insensitive.
   *
   * @param key name of the attribute
   * @param valueSuffix end of the attribute value
   * @return elements that have attributes that end with the value suffix
   */
  getElementsByAttributeValueEnding(
    key: string,
    valueSuffix: string
  ): Elements {throw Error(`not impl`);
    // return Collector.collect(
    //   new EvaluatorNS.AttributeWithValueEnding(key, valueSuffix),
    //   this
    // );
  }

  /**
   * Find elements that have attributes whose value contains the match string. Case insensitive.
   *
   * @param key name of the attribute
   * @param match substring of value to search for
   * @return elements that have attributes containing this text
   */
  getElementsByAttributeValueContaining(key: string, match: string): Elements {throw Error(`not impl`);
    // return Collector.collect(
    //   new EvaluatorNS.AttributeWithValueContaining(key, match),
    //   this
    // );
  }

  /**
   * Find elements that have attributes whose values match the supplied regular expression.
   * @param key name of the attribute
   * @param pattern compiled regular expression to match against attribute values
   * @return elements that have attributes matching this regular expression
   */
  getElementsByAttributeValueMatching(
    key: string,
    pattern: string | RegExp
  ): Elements {throw Error(`not impl`);
    // return Collector.collect(
    //   new EvaluatorNS.AttributeWithValueMatching(key, pattern),
    //   this
    // );
  }

  /**
   * Find elements whose sibling index is less than the supplied index.
   * @param index 0-based index
   * @return elements less than index
   */
  getElementsByIndexLessThan(index: number): Elements {throw Error(`not impl`);
    // return Collector.collect(new EvaluatorNS.IndexLessThan(index), this);
  }

  /**
   * Find elements whose sibling index is greater than the supplied index.
   * @param index 0-based index
   * @return elements greater than index
   */
  getElementsByIndexGreaterThan(index: number): Elements {throw Error(`not impl`);
    // return Collector.collect(new EvaluatorNS.IndexGreaterThan(index), this);
  }

  /**
   * Find elements whose sibling index is equal to the supplied index.
   * @param index 0-based index
   * @return elements equal to index
   */
  getElementsByIndexEquals(index: number): Elements {throw Error(`not impl`);
    // return Collector.collect(new EvaluatorNS.IndexEquals(index), this);
  }

  /**
   * Find elements that contain the specified string. The search is case insensitive. The text may appear directly
   * in the element, or in any of its descendants.
   * @param searchText to look for in the element's text
   * @return elements that contain the string, case insensitive.
   * @see Element#text()
   */
  getElementsContainingText(searchText: string) {throw Error(`not impl`);
    // return Collector.collect(new EvaluatorNS.ContainsText(searchText), this);
  }

  /**
   * Find elements that directly contain the specified string. The search is case insensitive. The text must appear directly
   * in the element, not in any of its descendants.
   * @param searchText to look for in the element's own text
   * @return elements that contain the string, case insensitive.
   * @see Element#ownText()
   */
  getElementsContainingOwnText(searchText: string): Elements {throw Error(`not impl`);
    // return Collector.collect(
    //   new EvaluatorNS.ContainsOwnText(searchText),
    //   this
    // );
  }

  /**
   * Find elements whose text matches the supplied regular expression.
   * @param pattern regular expression to match text against
   * @return elements matching the supplied regular expression.
   * @see Element#text()
   */
  getElementsMatchingText(pattern: string | RegExp): Elements {throw Error(`not impl`);
    // return Collector.collect(new EvaluatorNS.Matches(pattern), this);
  }

  /**
   * Find elements whose own text matches the supplied regular expression.
   * @param pattern regular expression to match text against
   * @return elements matching the supplied regular expression.
   * @see Element#ownText()
   */
  getElementsMatchingOwnText(pattern: string | RegExp): Elements {throw Error(`not impl`);
    // return Collector.collect(new EvaluatorNS.MatchesOwn(pattern), this);
  }

  /**
   * Find all elements under this element (including self, and children of children).
   *
   * @return all elements
   */
  getAllElements() {
    // return Collector.collect(new EvaluatorNS.AllElement(), this);
  }

  /**
   * Add a class name to this element's {@code class} attribute.
   * @param className class name to add
   * @return this element
   */
  addClass(className: string): this {
    Assert.notNull(className);
    let classes = this.classNames();
    this.classNames(classes.add(className));
    return this;
  }

  /**
   * Remove a class name from this element's {@code class} attribute.
   * @param className class name to remove
   * @return this element
   */
  removeClass(className: string): this {
    Assert.notNull(className);
    let classes = this.classNames();
    classes.delete(className);
    this.classNames([...classes.values()]);
    return this;
  }

  /**
    * Toggle a class name on this element's {@code class} attribute: if present, remove it; otherwise add it.
    * @param className class name to toggle
    * @return this element
    */
  toggleClass(className: string): this {
    Assert.notNull(className);
    let classes = this.classNames();
    if (classes.has(className)) classes.delete(className);
    else classes.add(className);
    this.classNames(classes);
    return this;
  }

  /**
   * Tests if this element has a class. Case insensitive.
   * @param className name of class to check for
   * @return true if it does, false if not
   */
  hasClass(className: string): boolean {
    if (this.hasAttributes()) return false;
    else {
      let classAttr = this.attrs.get("class", true)?.getValue() || "";
      let len = classAttr.length,
        wantLen = className.length;
      if (len === 0 && len < wantLen) return false;

      // if both lengths are equal, only need compare the className with the attribute
      if (len === wantLen) Objects.equalsIgnoreCase(className, classAttr);

      // otherwise, scan for whitespace and compare regions (with no string or arraylist allocations)
      let inClass: boolean = false,
        start = 0;
      for (let i = 0; i < len; i++) {
        let isWhitespace = StringUtil.isWhitespace(classAttr.charCodeAt(i));
        if (!isWhitespace && !inClass) {
          inClass = true;
          start = i;
        } else if (inClass) {
          // white space ends a class name, compare it with the requested one, ignore case
          if (i - start === wantLen) {
            let name = className.substr(start, wantLen);
            if (Objects.equalsIgnoreCase(classAttr, name)) return true;
          }
          inClass = false;
        }
      }

      // check the last entry
      if (inClass && len - start === wantLen) {
        let name = className.substr(start, wantLen);
        return Objects.equalsIgnoreCase(classAttr, name);
      }

      return false;
    }
  }

  /**
   * Gets the literal value of this element's "class" attribute
   * @return The literal class attribute, or <b>empty string</b> if no class attribute set.
   */
  className(): string {
    return this.attr("class").trim();
  }

  /**
   * Get all of the element's class names.
   * @return set of classnames, empty if no class attribute
   */
  classNames(): Set<string>;

  /**
   * Set the element's {@code class} attribute to the supplied class names.
   * @param classNames set of classes
   * @return this element, for chaining
   */
  classNames(classNames: string[]): this;
  classNames(classNames: Set<string>): this;

  /** @private */
  classNames(classNames?: string[] | Set<string>): any {
    // get classes
    if (classNames === undefined) {
      let classes = this.className().split(/\s+/);
      return new Set(classes);
    }

    // set classes
    else {
      Assert.notNull(classNames);
      let set = classNames instanceof Set ? classNames : new Set(classNames);
      if (set.size === 0) this.attributes().remove("class");
      else  {this.attributes().set("class", [...set.values()].join(" ") );}
      return this;
    }
  }

  /**
   * Get the value of a form element (input, textarea, etc).
   * @return the value of the form element, or empty string if not set.
   */
  val(): string;

  /**
   * Set the value of a form element (input, textarea, etc).
   * @param value value to set
   * @return this element (for chaining)
   */
  val(val: string): this;

  /** @private */
  val(val?: string): any {
    let area = this.normalName() === "textarea";
    if (val === undefined) return area ? this.text() : this.attr("value");
    else {
      if (area) this.text(val);
      else this.attr("value", val);
      return this;
    }
  }

  /**
   * Test if this element has any text content (that is not just whitespace).
   * @return true if element has non-blank text content.
   * */
  hasText(): boolean {
    return this.childNodes().some((node) => {
      if (TextNode.is(node)) return !node.isBlank();
      else if (node instanceof Element) return node.hasText();
      else return false;
    });
  }

  /**
   * Gets the <b>normalized, combined text</b> of this element and all its children.
   * @return unencoded, normalized text, or empty string if none.
   * */
  text(): string;

  /**
   * Set the text of this element.
   * @param text unencoded text
   * @return this element
   */
  text(text: string): this;

  /** @private */
  text(text?: string): any {throw Error(`not impl`);
    // // get text
    // if (text === undefined) {
    //   let accum = new StringBuilder();
    //   let visitor = new NodeVisitorImpl()
    //     .withHead((node, depth) => {
    //       if (NodeUtils.isTextNode(node))
    //         Element.appendNormalisedText(accum, node);
    //       else if (
    //         NodeUtils.isElement(node) &&
    //         !accum.isEmpty() &&
    //         (node.isBlock() || node.tagNode.getName() === "br") &&
    //         !TextNode.lastCharIsWhitespace(accum)
    //       ) {
    //         accum.append(" ");
    //       }
    //     })
    //     .withTail((node, depth) => {
    //       if (
    //         NodeUtils.isElement(node) &&
    //         node.isBlock() &&
    //         node.nextSibling() instanceof TextNode &&
    //         !TextNode.lastCharIsWhitespace(accum)
    //       ) {
    //         accum.append(" ");
    //       }
    //     });

    //   NodeTraversor.traverse(visitor, this);
    //   return accum.toString();
    // }

    // // set text
    // else return this.set_text(text);
  }

  protected set_text(text: string): Element {throw Error(`not impl`);
    // Assert.notNull(text);
    //   this.empty();

    //   let owner = this.getOwnerDocument();
    //   let isContentForTagData: boolean =
    //     owner?.parser().isContentForTagData(this.normalName()) || false;
    //   if (Objects.notNull(owner) && isContentForTagData)
    //     this.appendChild(new DataNode(text));
    //   else this.appendChild(new TextNode(text));
    //   return this;
  }

  /**
   * Get the combined data of this element. Data is e.g. the inside of a {@code <script>} tag. Note that data is NOT the
   * text of the element. Use {@link #text()} to get the text that would be visible to a user, and {@code data()}
   * for the contents of scripts, comments, CSS styles, etc.
   * @return the data, or empty string if none
   * @see #dataNodes()
   */
  data(): string {throw Error(`not impl`);
    // return this.childNodes()
    //   .map((node) => {
    //     if (NodeUtils.isDataNode(node)) return node.getWholeData();
    //     else if (NodeUtils.isComment(node)) return node.getData();
    //     else if (node instanceof Element) return node.data();
    //     else if (node instanceof CDataNode) return node.getWholeText();
    //     else return "";
    //   })
    //   .join("");
  }

  /**
   * @return String of HTML
   */
  html(): string;

  /**
   * Set this element's inner HTML. Clears the existing HTML first.
   * @param html HTML to parse and set into this element
   */
  html(html: string): this;

  /**
   * @private
   * @param {string=} html
   * */
  html(html?: string): any {
    // set html
    if (html !== undefined) {
      Assert.notEmpty(html);
      this.remove();
      this.append(html);
      return this;
    }

    // get html
    else {
      let accum = new StringBuilder();
      this.htmlImpl(accum);
      let trim = OutputSetting.forNode(this).prettyPrint;
      return !!trim ? accum.toString().trim() : accum.toString();
    }
  }

  htmlImpl(sb: StringBuilder) {
    for (let pos = 0; pos < this.childNodeSize(); pos++) {
      this.getChildNode(pos).outerHtmlImpl(sb);
    }
    return sb;
  }

  /**
   * Get the (unencoded) text of all children of this element
   * @return unencoded, un-normalized text
   */
  wholeText(): string {throw Error(`not impl`);
    // let accum = new StringBuilder();
    // NodeTraversor.traverse(
    //   new NodeVisitorImpl().withHead((node: Node, depth: number) => {
    //     if (NodeUtils.isTextNode(node)) accum.append(node.getWholeText());
    //   }),
    //   this
    // );
    // return accum.toString();
  }

  /**
   * Gets the (normalized) text owned by this element only;
   * @return unencoded text, or empty string if none.
   */
  ownText(): string {
    let sb = new StringBuilder();
    this.ownTextImpl(sb);
    return sb.toString().trim();
  }

  private ownTextImpl(accum: StringBuilder) {throw Error(`not impl`);
    // for (let child of this.childNodes()) {
    //   if (child instanceof TextNode)
    //     Element.appendNormalisedText(accum, child);
    //   else if (child instanceof Element)
    //     Element.appendWhitespaceIfBr(child, accum);
    // }
  }

  clone(): Element {
    return <any>super.clone();
  }

  doClone(parent: Node): Element {
    let clone: Element = <any>super.doClone(parent);
    clone.attrs = this.attributes()?.clone();
    clone.nodeList = new NodeList(this.nodeList.all());
    return clone;
  }

  shallowClone(): Element {
    return new Element(
      this.tag(),
      this.getBaseUri(),
      this.attributes()?.clone()
    );
  }

  outerHtmlHead(
    accum: StringBuilder,
    depth: number,
    setting: OutputSetting
  ): void {
    if (
      setting.prettyPrint &&
      this.isFormatAsBlock(setting) &&
      !this.isInlineable(setting) &&
      accum.length > 0
    ) {
      this.indent(accum, depth, setting);
    }

    //
    accum.append("<").append(this.tagName());
    if (this.hasAttributes()) this.attrs.htmlImpl(accum, setting);

    // selfclosing includes unknown tags, isEmpty defines tags that are always empty
    if (this.childNodes().isEmpty() && this.tagNode.isSelfClosing) {
      let end = setting.syntax === "html" && this.tagNode.isEmpty();
      accum.append(`${end ? ">" : " />"}`);
    }
  }

  outerHtmlTail( accum: StringBuilder, depth: number, setting: OutputSetting ): void {
    if (this.childNodes().isEmpty() && this.tag().isSelfClosing) return;
    if (this.useAppendIndent(setting)) this.indent(accum, depth, setting);
    accum.append("</").append(this.tagName()).append(">");
  }

  private useAppendIndent(setting: OutputSetting) {
    if (!setting.prettyPrint) return false;
    if (this.childNodes().isEmpty()) return false;
    if (!!this.tagNode.formatAsBlock) return true;
    if (!setting.outline) return false;
    if (this.childNodeSize() > 1) return true;
    else
      return (
        this.childNodeSize() === 1 &&
        !TextNode.is(this.getChildNode(0))
      );
  }

  private isFormatAsBlock(setting: OutputSetting): boolean {
    return (
      this.tag().formatAsBlock ||
      (this.hasParent() && this.parent().tag().formatAsBlock) ||
      setting.outline
    );
  }

  private isInlineable(setting: OutputSetting) {
    let tag = this.tag();
    return (
      tag.isInline &&
      !tag.isEmpty() &&
      (!this.hasParent() || this.parent().isBlock()) &&
      Objects.notNull(this.previousSibling()) &&
      !setting.outline
    );
  }

  //TextNode
  static appendNormalisedText(accum: StringBuilder, node: any) {throw Error(`not impl`);
    // let text = node.getWholeText();
    // let isSpace = Element.preserveWhitespace(node.parent());
    // if (isSpace || node instanceof CDataNode) accum.append(text);
    // else
    //   StringUtil.appendNormalisedWhitespace(
    //     accum,
    //     text,
    //     TextNode.lastCharIsWhitespace(accum)
    //   );
  }

  static appendWhitespaceIfBr(element: Element, accum: StringBuilder) {throw Error(`not impl`);
    // let name = element.tag().getName();
    // if (name === "br" && !TextNode.lastCharIsWhitespace(accum))
    //   accum.append(" ");
  }

  static preserveWhitespace(node: Node): boolean {
    if (!(node instanceof Element)) return false;
    else {
      let i = 0;
      let el: Element = node;
      do {
        let isSpace = el.tag().preserveWhitespace;
        if (isSpace) return true;
        el = el.parent();
        i++;
      } while (i < 6 && node !== null);
	  
	  // else
	  return false;
    }
  }
}
