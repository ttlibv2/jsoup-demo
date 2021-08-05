import { Assert } from "../helper/Assert";
import { ParseSetting, OutputSetting } from "../parse/Setting";
import { Tag } from "../parse/Tag";
import { DocumentType } from "./DocumentType";
import { Element } from "./Element";
import { LeafNode } from "./1006_LeafNode";
import { StringUtil } from "../helper/StringUtil";
import { Objects } from "../helper/Objects";
import { ArrayList } from "../helper/ArrayList";
import { TextNode } from "./TextNode";
import { Node } from "./1004_Node";
import { Parser } from "../parse/Parser";
// import * as EvaluatorNS from "../select/Evaluator";

export enum QuirksMode {
  noQuirks,
  quirks,
  limitedQuirks
}

/**
 * A HTML Document.
 */
export class Document extends Element {

  static isDoc(node: any): boolean {
    return node instanceof Document;
  }

  static readonly titleEval: any = undefined;// = new EvaluatorNS.Tag("title");

  outputSetting: OutputSetting;
  quirksMode: QuirksMode = QuirksMode.noQuirks;

  private parserImpl: Parser;
  private location_: string;
  private _updateMetaCharset: boolean = false;

  /**
   * Create a new, empty Document.
   * @param baseUri base URI of document
   */
  constructor(baseUri: string) {
    super(Tag.valueOf("#root", ParseSetting.htmlDefault), baseUri);
    this.location_ = baseUri;
    this.parserImpl = Parser.htmlParser();
  }

  /** @override */
  parser(): any;
  parser(parser: any): this;
  parser(parser?: any): any {
    if (parser === undefined) return this.parserImpl;
    else {
      this.parserImpl = Assert.notNull(parser);
      return this;
    }
  }

  /**
   * Create a valid, empty shell of a document, suitable for adding more elements to.
   * @param baseUri baseUri of document
   * @return document with html, head, and body elements.
   */
  static createShell(baseUri: string): Document {
    Assert.notNull(baseUri);
    let doc = new Document(baseUri);
    doc.parserImpl = doc.parser();
    let html = doc.appendElement("html");
    html.appendElement("head");
    html.appendElement("body");
    return doc;
  }

  nodeName(): string {
    return "#document";
  }

  outerHtml() {
    return super.html(); // no outer wrapper tag
  }

  /**
   * Set the text of the {@code body} of this document. Any existing nodes within the body will be cleared.
   * @param text unencoded text
   * @return this document
   */
  set_text(text: string): Element {
    this.body().text(text); // overridden to not nuke doc structure
    return this;
  }

  /**
   * Returns whether the element with charset information in this document is
   * updated on changes through {@link #charset(java.nio.charset.Charset)
   * Document.charset(Charset)} or not.
   *
   * @return Returns <tt>true</tt> if the element is updated on charset
   * changes, <tt>false</tt> if not
   */
  get updateMetaCharsetElement() {
    return this._updateMetaCharset;
  }

  /**
   * Sets whether the element with charset information in this document is
   * updated on changes through {@link #charset(java.nio.charset.Charset)
   * Document.charset(Charset)} or not.
   *
   * <p>If set to <tt>false</tt> <i>(default)</i> there are no elements
   * modified.</p>
   *
   * @param update If <tt>true</tt> the element updated on charset
   * changes, <tt>false</tt> if not
   *
   * @see #charset(java.nio.charset.Charset)
   */
  set updateMetaCharsetElement(update: boolean) {
    this._updateMetaCharset = update;
  }

  /**
   * Returns the charset used in this document. This method is equivalent
   * to {@link OutputSettings#charset()}.
   *
   * @return Current Charset
   *
   * @see OutputSettings#charset()
   */
  get charset(): string {
    return this.outputSetting.charset;
  }

  /**
   * Get the URL this Document was parsed from. If the starting URL is a redirect,
   * this will return the final URL from which the document was served from.
   * <p>Will return an empty string if the location is unknown (e.g. if parsed from a String).
   * @return location
   */
  location(): string {
    return this.location_;
  }

  /**
   * Returns this Document's doctype.
   * @return document type, or null if not set
   */
  documentType(): DocumentType {
    for (let node of this.childNodes()) {
      if (node instanceof DocumentType) return node;
      else if (!(node instanceof LeafNode)) return null;
    }
    return null;
  }

  /**
   * Find the root HTML element, or create it if it doesn't exist.
   * @return the root HTML element.
   */
  htmlEl(): Element {
    let node = this.childElementsList().find(
      (el) => el.normalName() === "html"
    );
    return node || this.appendElement("html");
  }

  /**
   * Get this document's `head` element.
   * As a side-effect, if this Document does not already have a HTML structure, it will be created.
   * If you do not wantn that, use `#selectFirst("head")` instead.
   * @return `element`
   */
  head(): Element {
    let node = this.htmlEl()
      .childElementsList()
      .find((el) => el.normalName() === "head");
    return node || this.appendElement("head");
  }

  /**
   * Get this document's `<body>` or `<frameset>}` element.
   * As a <b>side-effect</b>, if this Document does not already have a HTML structure, it will be created with a `<body>` element.
   * If you do not want that, use `#selectFirst("body")` instead.
   * @return element for documents with a `<body>`
   */
  body(): Element {
    let node = this.htmlEl()
      .childElementsList()
      .find((el) => {
        let name = el.normalName();
        return name === "body" || name === "frameset";
      });
    return node || this.appendElement("body");
  }

  /**
   * Get the string contents of the document's {@code title} element.
   * @return Trimmed title, or empty string if none set.
   */
  title(): string;

  /**
   * Set the document's `title` element. Updates the existing element, or adds {@code title} to {@code head} if not present
   * @param title string to set as title
   */
  title(title: string): this;

  /**
   * @private
   * @param {string=} title
   */
  title(title?: string): any {
    // title is a preserve whitespace tag (for document output), but normalised here
    // get title
    if (title === undefined) {
      let titleEl = this.head().selectFirst(Document.titleEval);
      return Objects.notNull(titleEl)
        ? StringUtil.normaliseWhitespace(titleEl.text()).trim()
        : "";
    }

    // set title
    else {
      Assert.notNull(title);
      let titleEl = this.head().selectFirst(Document.titleEval);
      titleEl = titleEl || this.head().appendElement("title");
      titleEl.text(title);
      return this;
    }
  }

  /**
   * Create a new Element, with this document's base uri. Does not make the new element a child of this document.
   * @param tagName element tag name (e.g. {@code a})
   * @return new element
   */
  createElement(tagName: string): Element {
    let tag = Tag.valueOf(tagName, ParseSetting.preserveCase);
    return new Element(tag, this.getBaseUri());
  }

  /**
   * Normalise the document. This happens after the parse phase so generally does not need to be called.
   * Moves any text content that is not in the body element into the body.
   * @return this document after normalisation
   */
  normalise(): Document {
    let htmlEl = this.htmlEl(); // these all create if not found
    let head = this.head();

    this.body();

    // pull text nodes out of root, html, and head els, and push into body. non-text nodes are already taken care
    // of. do in inverse order to maintain text order.
    this.normaliseTextNodes(head);
    this.normaliseTextNodes(htmlEl);
    this.normaliseTextNodes(this);
    this.normaliseStructure("head", htmlEl);
    this.normaliseStructure("body", htmlEl);
    this.ensureMetaCharsetElement();
    return this;
  }

  /**
   * Ensures a meta charset (html) or xml declaration (xml) with the current
   * encoding used. This only applies with
   * {@link #updateMetaCharsetElement(boolean) updateMetaCharset} set to
   * <tt>true</tt>, otherwise this method does nothing.
   *
   * <ul>
   * <li>An existing element gets updated with the current charset</li>
   * <li>If there's no element yet it will be inserted</li>
   * <li>Obsolete elements are removed</li>
   * </ul>
   *
   * <p><b>Elements used:</b></p>
   *
   * <ul>
   * <li><b>Html:</b> <i>&lt;meta charset="CHARSET"&gt;</i></li>
   * <li><b>Xml:</b> <i>&lt;?xml version="1.0" encoding="CHARSET"&gt;</i></li>
   * </ul>
   */
  private ensureMetaCharsetElement() {
    throw Error(`ensureMetaCharsetElement`);
    // if (this._updateMetaCharset) {
    //   let syntax = this.outputSetting.syntax;

    //   // is html
    //   if (syntax === "html") {
    //     let metaCharset = this.selectFirst("meta[charset]");
    //     if (Objects.notNull(metaCharset))
    //       metaCharset.attr("charset", this.charset);
    //     else this.head().appendElement("meta").attr("charset", this.charset);
    //     this.select("meta[name=charset]").remove(); // Remove obsolete elements
    //   }

    //   // is xml
    //   else if (syntax === "xml") {
    //     let node = this.childNodes().get(0);
    //     if (node instanceof XmlDeclaration) {
    //       let decl = node;

    //       // xml
    //       if (decl.name() === "xml") {
    //         decl.attr("encoding", this.charset);
    //         if (decl.hasAttr("version")) decl.attr("version", "1.0");
    //       } else {
    //         decl = new XmlDeclaration("xml", false);
    //         decl.attr("version", "1.0");
    //         decl.attr("encoding", this.charset);
    //         this.prependChild(decl);
    //       }
    //     } //
    //     else {
    //       let decl = new XmlDeclaration("xml", false);
    //       decl.attr("version", "1.0");
    //       decl.attr("encoding", this.charset);
    //       this.prependChild(decl);
    //     }
    //   }
    // }
  }

  // merge multiple <head> or <body> contents into one, delete the remainder, and ensure they are owned by <html>
  private normaliseStructure(tag: string, htmlEl: Element) {
    let elements = this.getElementsByTag(tag);
    let master = elements.first(); // will always be available as created above if not existent
    if (elements.size() > 1) {
      // dupes, move contents to master
      let toMove = new ArrayList<Node>();
      for (let dupe of elements) {
        toMove.addAll(dupe.childNodes());
        dupe.remove();
      }
      master.appendChildren(toMove);
    }

    // ensure parented by <html>
    let p = master.parent();
    if (Objects.notNull(p) && !master.parent().equals(htmlEl)) {
      htmlEl.appendChild(master); // includes remove()
    }
  }

  private normaliseTextNodes(element: Element) {
    let toMove = element
      .childNodes()
      .filter((node) => node instanceof TextNode && !node.isBlank());
    for (let pos = toMove.length - 1; pos >= 0; pos--) {
      let node = toMove[pos];
      element.removeChild(node);
      this.body().prependChild(new TextNode(" "));
      this.body().prependChild(node);
    }
  }
}
