/*eslint-disable */
import { ArrayList } from "../helper/ArrayList";
import { Assert } from "../helper/Assert";
import { Normalizer } from "../helper/Normalizer";
import { Objects } from "../helper/Objects";
import { Document } from "../nodes/Document";
import { Element, PseudoText } from "../nodes/Element";
import { NodeUtils } from "../nodes/NodeUtils";
import {Tag as TagNode} from '../parse/Tag';
import { NodeType } from "../nodes/1004_Node";

/**
 * Evaluates that an element matches the selector.
 */
export abstract class Evaluator {
  /**
   * Test if the element meets the evaluator's requirements.
   *
   * @param root    Root of the matching subtree
   * @param element tested element
   * @return Returns <tt>true</tt> if the requirements are met or
   * <tt>false</tt> otherwise
   */
  abstract matches(root: Element, element: Element): boolean;

  abstract toString(): string;
}

/** Evaluator for all element */
export class AllElement extends Evaluator {

  matches(root: Element, element: Element): boolean {
    return true;
  }

  toString(): string {
    return `*`;
  }
}

/**
 * Evaluator for tag name: div, ul,...
 * @match `<tag>`
 */
export class Tag extends Evaluator {

  constructor(private tagName: string) {
    super();
  }

  matches(root: Element, element: Element): boolean {
    return element.normalName() === this.tagName;
  }

  toString(): string {
    return this.tagName;
  }
}

/**
 * Evaluator for tag name that ends with
 * @match `tagName.endsWith(string)`
 */
export class TagEndsWith extends Evaluator {
  constructor(private tagName: string) {
    super();
  }

  matches(root: Element, element: Element): boolean {
    return element.normalName().endsWith(this.tagName);
  }

  toString(): string {
    return this.tagName;
  }
}

/**
 * Evaluator for element id
 * @match `#id`
 */
export class Id extends Evaluator {
  constructor(private id: string) {
    super();
  }

  matches(root: Element, element: Element): boolean {
    return this.id === element.id();
  }

  toString(): string {
    return `#${this.id}`;
  }
}

/**
 * Evaluator for element class
 * @match `.class`
 */
export class Class extends Evaluator {
  constructor(private className: string) {
    super();
  }

  matches(root: Element, element: Element): boolean {
    return element.hasClass(this.className);
  }

  toString(): string {
    return `.${this.className}`;
  }
}

/**
 * Evaluator for attribute name matching
 * @match `hasAttr(string)`
 */
export class Attribute extends Evaluator {
  constructor(private name: string) {
    super();
  }

  matches(root: Element, element: Element): boolean {
    return element.hasAttr(this.name);
  }

  toString(): string {
    return `[${this.name}]`;
  }
}

/**
 * Evaluator for attribute name prefix matching
 * @match `attrName.startsWith(string)` || `[^string]`
 */
export class AttributeStarting extends Evaluator {
  /**
   * @param {string} keyPrefix
   */
  constructor(private keyPrefix: string) {
    super();
    keyPrefix = Assert.notEmpty(keyPrefix);
    this.keyPrefix = Normalizer.lowerCase(keyPrefix);
  }

  matches(root: Element, element: Element): boolean {
    return element.attributes().some((attr) => {
      let key = Normalizer.lowerCase(attr.getName());
      return key.startsWith(this.keyPrefix);
    });
  }

  toString(): string {
    return `[^${this.keyPrefix}]`;
  }
}

/**
 * Abstract evaluator for attribute name/value matching
 */
export abstract class AttributeKeyPair extends Evaluator {
  /**
   * Create new constructor
   * @param {string} key
   * @param {any} value
   * @param {boolean=true} trimValue
   */
  constructor(
    protected key: string, //
    protected value: any, //
    protected trimValue: boolean = true
  ) {
    super();

    Assert.notEmpty(key);

    this.key = Normalizer.normalize(key);

    if (typeof value === "string") {
      Assert.notEmpty(value);
      let isSingle = value.startsWith(`'`) && value.endsWith(`'`);
      let isDouble = value.startsWith(`"`) && value.endsWith(`"`);
      let isStringLiteral = isSingle || isDouble;
      if (isStringLiteral) value = value.substring(1, value.length - 1);
      this.value = Normalizer.normalize(value, trimValue && isStringLiteral);
    } else {
      Assert.notNull(value);
      this.value = value;
    }
  }

  getValue(): any {
    return this.value;
  }
}

/**
 * Evaluator for attribute name/value matching
 * @match `[attrName=attrValue]`
 */
export class AttributeWithValue extends AttributeKeyPair {
  /**
   * @param {string} attrName
   * @param {string} attrValue
   */
  constructor(attrName: string, attrValue: string) {
    super(attrName, attrValue);
  }

  matches(root: Element, element: Element): boolean {
    let hasAttr = element.hasAttr(this.key);
    let lowerVal = this.getValue().toLowerCase();
    let elVal = element.attr(this.key).trim().toLowerCase();
    return hasAttr && lowerVal === elVal;
  }

  toString(): string {
    return `[${this.key}=${this.value}]`;
  }
}

/**
 * Evaluator for attribute name != value matching
 * @match `[attrName!= attrValue]`
 */
export class AttributeWithValueNot extends AttributeKeyPair {

  /**
   * @param {string} attrName
   * @param {string} attrValue
   */
  constructor(attrName: string, attrValue: string) {
    super(attrName, attrValue);
  }

  matches(root: Element, element: Element): boolean {
    let lowerVal = this.getValue().toLowerCase();
    let attrVal = element.attr(this.key).trim().toLowerCase();
    return lowerVal === attrVal;
  }

  toString(): string {
    return `[${this.key}!=${this.value}]`;
  }
}

/**
 * Evaluator for attribute name/value matching (value prefix)
 * @match `[attrName^= attrValue]`
 */
export class AttributeWithValueStarting extends AttributeKeyPair {
  /**
   * @param {string} attrName
   * @param {string} attrValue
   */
  constructor(attrName: string, attrValue: string) {
    super(attrName, attrValue, false);
  }

  matches(root: Element, element: Element): boolean {
    let hasAttr = element.hasAttr(this.key);
    let lowerVal = Normalizer.lowerCase(element.attr(this.key)); // value is lower case already
    return hasAttr && lowerVal.startsWith(this.value);
  }

  toString(): string {
    return `[${this.key}^=${this.value}]`;
  }
}

/**
 * Evaluator for attribute name/value matching (value ending)
 * @match `[attrName$=attrValue]`
 */
export class AttributeWithValueEnding extends AttributeKeyPair {
  /**
   * @param {string} attrName
   * @param {string} attrValue
   */
  constructor(attrName: string, attrValue: string) {
    super(attrName, attrValue, false);
  }

  matches(root: Element, element: Element): boolean {
    let hasAttr = element.hasAttr(this.key);
    let lowerVal = Normalizer.lowerCase(element.attr(this.key)); // value is lower case already
    return hasAttr && lowerVal.endsWith(this.value);
  }

  toString(): string {
    return `[${this.key}$=${this.value}]`;
  }
}

/**
 * Evaluator for attribute name/value matching (value containing)
 * @match `[attrName*=attrValue]`
 */
export class AttributeWithValueContaining extends AttributeKeyPair {
  /**
   * @param {string} attrName
   * @param {string} attrValue
   */
  constructor(attrName: string, attrValue: string) {
    super(attrName, attrValue);
  }

  matches(root: Element, element: Element): boolean {
    let hasAttr = element.hasAttr(this.key);
    let lowerVal = Normalizer.lowerCase(element.attr(this.key)); // value is lower case
    return hasAttr && lowerVal.includes(this.value);
  }

  toString(): string {
    return `[${this.key}*=${this.value}]`;
  }
}

/**
 * Evaluator for attribute name/value matching (value regex matching)
 * @match `[attrName~=pattern]`
 */
export class AttributeWithValueMatching extends AttributeKeyPair {
  /**
   * @param {string} attrName
   * @param {RegExp | string} pattern
   */
  constructor(attrName: string, pattern: RegExp | string) {
    super(Normalizer.normalize(attrName), RegExp(pattern));
	
  }

  getValue(): RegExp {
    return this.value;
  }

  matches(root: Element, element: Element): boolean {
    let hasAttr = element.hasAttr(this.key);
	let attrValue = element.attr(this.key)||'';
    let isMatch = this.getValue().test(attrValue);
    return hasAttr && isMatch;
  }

  toString(): string {
    return `[${this.key}~=${this.value.toString()}]`;
  }
}

//=============================================================
//  [Combinators]
//
//  E F	        an F element descended from an E element	        div a, .logo h1
//  E > F	    an F direct child of E	                            ol > li
//  E + F	    an F element immediately preceded by sibling E	    li + li, div.head + div
//  E ~ F	    an F element preceded by sibling E	                h1 ~ p
//  E, F, G	    all matching elements E, F, or G	                a[href], div, h3
//=============================================================

/**
 * Base combining (and, or) evaluator.
 */
export abstract class CombiningEvaluator extends Evaluator {
  protected readonly list: ArrayList<Evaluator> = new ArrayList();

  constructor();
  constructor(array: Array<Evaluator>);
  constructor(iterable: Iterable<Evaluator>);
  constructor(list?: Iterable<Evaluator>) {
    super();
    if (Objects.notNull(list)) {
      this.list.addAll(list);
    }
  }

  get size(): number {
    return this.list.size();
  }

  rightMostEvaluator(): Evaluator {
    return this.list.get(this.size - 1) || null;
  }

  replaceRightMostEvaluator(evalu: Evaluator): void {
    this.list.set(this.size - 1, evalu);
  }
}

/**
 * Combining `and` evaluator.
 */
export class And extends CombiningEvaluator {
	
  matches(root: Element, node: Element): boolean {
    return !this.list.clone().reverse().some((ev) =>!ev.matches(root, node));
  }

  toString(): string {
    return this.list.join("");
  }
}

/**
 * Combining `or` evaluator.
 */
export class Or extends CombiningEvaluator {
  /**
   * Create a new Or evaluator. The initial evaluators are ANDed together and used as the first clause of the OR.
   * @param evaluators initial OR clause (these are wrapped into an AND evaluator).
   */
  constructor(evaluators?: Evaluator[]) {
    super(evaluators || []);
  }

  add(evalu: Evaluator) {
    this.list.add(evalu);
  }

  matches(root: Element, node: Element): boolean {
    return this.list.some((ev) => ev.matches(root, node));
  }

  toString(): string {
    return this.list.join(", ");
  }
}

//=============================================================
// :lt(n)	elements whose sibling index is less than n	td:lt(3) finds the first 3 cells of each row
// :gt(n)	elements whose sibling index is greater than n	td:gt(1) finds cells after skipping the first two
// :eq(n)	elements whose sibling index is equal to n	td:eq(0) finds the first cell of each row
//=============================================================

/** Abstract evaluator for sibling index matching */
export abstract class IndexEvaluator extends Evaluator {

  /**
   * @param {number} index 
   */
  constructor(protected index: number) {
    super();
  }
}

/**
 * Evaluator for matching by sibling index number (e < idx)
 * @match `:lt(n)`
 * */
export class IndexLessThan extends IndexEvaluator {

  matches(root: Element, element: Element): boolean {
    return root != element && element.elementSiblingIndex() < this.index;
  }

  toString(): string {
    return `:lt(${this.index})`;
  }
}

/**
 * Evaluator for matching by sibling index number (e > idx)
 * @match `:gt(n)`
 * */
export class IndexGreaterThan extends IndexEvaluator {

  matches(root: Element, element: Element): boolean {
    return element.elementSiblingIndex() > this.index;
  }

  toString(): string {
    return `:gt(${this.index})`;
  }
}

/**
 * Evaluator for matching by sibling index number (e = idx)
 * @match `:eq(n)`
 * */
export class IndexEquals extends IndexEvaluator {

  matches(root: Element, element: Element): boolean {
    return element.elementSiblingIndex() === this.index;
  }

  toString(): string {
    return `:eq(${this.index})`;
  }
}

/**
 * Evaluator for matching the last sibling (css :last-child)
 * @match `:last-child`
 */
export class IsLastChild extends Evaluator {

  matches(root: Element, element: Element): boolean {
    let p = element.parent();
    if (Objects.isNull(p)) return false;
    if (p instanceof Document) return false;
    else return p.elementSiblingIndex() === p.children().size() - 1;
  }

  toString(): string {
    return `:last-child`;
  }
}

//-----------------------------------------------------
//	CssNthEvaluator
//----------------------------------------------------

/**
 * Css pseudo selector
 * @match `:[pseudo](an+b)` || `:[pseudo](b)` || `:[pseudo](an)`
 * @example `:nth-of-type(2n+1)`
 */
export abstract class CssNthEvaluator extends Evaluator {

  /**
   * Create new constructor
   * @param a {number}
   * @param b {number}
   */
  constructor(protected a: number, protected b: number) {
    super();
  }

  abstract getPseudoClass(): string;
  abstract calculatePosition(root: Element, element: Element): number;

  matches(root: Element, element: Element): boolean {
    let p = element.parent();
    if (Objects.isNull(p) || NodeUtils.isDocument(p)) return false;
    else {
      let pos = this.calculatePosition(root, element);
      if (this.a === 0) return pos === this.b;
      else return (pos - this.b) * this.a >= 0 && (pos - this.b) % this.a == 0;
    }
  }

  toString(): string {
    let ps = this.getPseudoClass(), a = this.a, b = this.b;
    return a === 0 ? `:${ps}(${b})` : b === 0 ? `:${ps}(${a}n)` : `:${ps}(${a}n+${b})`;
  }
}

//-----------------------------------------------------
//	nth-of-type
//----------------------------------------------------

/** Css pseudo class nth-of-type */
export class IsNthOfType extends CssNthEvaluator {
  getPseudoClass(): string {
    return `nth-of-type`;
  }

  calculatePosition(root: Element, element: Element): number {
    let pos = 0;
    if (Objects.isNull(element.parent())) return 0;
    else {
      let family = element.parent().children();
      for (let el of family) {
        if (el.tag().equals(element.tag())) pos++;
        if (el === element) break;
      }
      return pos;
    }
  }
}

/**
 * Elements that are the first sibling of its type in the list of children of its parent element
 * @match `:first-of-type`
 */
export class IsFirstOfType extends IsNthOfType {

  constructor() {
    super(0, 1);
  }

  getPseudoClass(): string {
    return `:first-of-type`;
  }

}

/**
 * pseudo-class notation represents an element that has an+b-1 siblings with 
 * the same expanded element name after it in the document tree, 
 * for any zero or positive integer value of n, and has a parent element
 * @match `:nth-last-of-type(an+b)`
 * @example `img:nth-last-of-type(2n+1)`
 */
export class IsLastOfType extends CssNthEvaluator {

  constructor() {
    super(0, 1);
  }

  calculatePosition(root: Element, element: Element): number {
    let pos = 0;
    if (Objects.isNull(element.parent())) return 0;
    else {
      let family = element.parent().children();
      for (let i = element.elementSiblingIndex(); i < family.size(); i++) {
        if (family.get(i).tag().equals(element.tag())) pos++;
      }
      return pos;
    }
  }

  getPseudoClass(): string {
    return `nth-last-of-type`;
  }

}

/**
 * elements that have an+b-1 siblings before it in the document tree, 
 * for any positive integer or zero value of n, and has a parent element. 
 * For values of a and b greater than zero, this effectively divides the element's 
 * children into groups of a elements (the last group taking the remainder), 
 * and selecting the bth element of each group. For example, this allows the selectors 
 * to address every other row in a table, and could be used to alternate the color 
 * of paragraph text in a cycle of four. The a and b values must be integers 
 * (positive, negative, or zero). 
 * The index of the first child of an element is 1.
 * In addition to this, `:nth-child()` can take odd and even as arguments instead. 
 * odd has the same signification as 2n+1, and even has the same signification as 2n.
 * @match `:nth-child(an+b)`
 * @example 
 * - `tr:nth-child(2n+1)` finds every odd row of a table. 
 * - `:nth-child(10n-1)` the 9th, 19th, 29th, etc, element. 
 * - `li:nth-child(5)` the 5h li
 */
export class IsNthChild extends CssNthEvaluator {

  calculatePosition(root: Element, element: Element): number {
    return element.elementSiblingIndex() + 1;
  }

  getPseudoClass(): string {
    return `nth-child`;
  }
}

/**
 * Elements that have `an+b-1` siblings after it in the document tree. Otherwise like `:nth-child()`
 * @match `:nth-last-child(an+b)`
 * @example `tr:nth-last-child(-n+2)` the last two rows of a table
 */
export class IsNthLastChild extends CssNthEvaluator {

  getPseudoClass(): string {
    return `nth-last-child`;
  }

  calculatePosition(root: Element, element: Element): number {
    let p = element.parent();
    if (Objects.isNull(p)) return 0;
    else return p.children().size() - element.elementSiblingIndex();
  }
}

/**
 * pseudo-class notation represents an element that has an+b-1 siblings 
 * with the same expanded element name after it in the document tree, 
 * for any zero or positive integer value of n, and has a parent element
 * @match `:nth-last-of-type(an+b)`
 * @example `img:nth-last-of-type(2n+1)`
 */
export class IsNthLastOfType extends CssNthEvaluator {

  getPseudoClass(): string {
    return `nth-last-of-type`;
  }

  calculatePosition(root: Element, element: Element): number {
    let pos = 0;
    if (Objects.isNull(element.parent())) return 0;
    else {
      let family = element.parent().children();
      for (let i = element.elementSiblingIndex(); i < family.size(); i++) {
        if (family.get(i).tag().equals(element.tag())) pos++;
      }
      return pos;
    }
  }

}

/**
 * Evaluator for matching the first sibling (css :first-child)
 * @match `:first-child`
 * @example `	div > p:first-child`
 */
export class IsFirstChild extends Evaluator {

  toString(): string {
    return `:first-child`;
  }

  matches(root: Element, element: Element): boolean {
    let p = element.parent();
    if (Objects.isNull(p)) return false;
    if (NodeUtils.isDocument(p)) return false;
    else return element.elementSiblingIndex() === 0;
  }
}

/**
 * The element that is the root of the document. In HTML, this is the html element
 * @see <a href="http://www.w3.org/TR/selectors/#root-pseudo">:root selector</a>
 * @match `:root`
 */
export class IsRoot extends Evaluator {

  toString(): string {
    return `:root`;
  }

  matches(root: Element, element: Element): boolean {
    let r = NodeUtils.isDocument(root) ? root.child(0) : root;
    return element === r;
  }

}

/**
 * elements that have a parent element and whose parent element have no other element children
 * @match `:only-child`
 */
export class IsOnlyChild extends Evaluator {

  toString(): string {
    return `:only-child`;
  }

  matches(root: Element, element: Element): boolean {
    let p = element.parent();
    if (Objects.isNull(p)) return false;
    if (NodeUtils.isDocument(p)) return false;
    else return element.siblingElements().isEmpty();
  }
}

/**
 * an element that has a parent element and whose parent element has no other element children with the same expanded element name
 * @match `:only-of-type`
 */
export class IsOnlyOfType extends Evaluator {

  toString(): string {
    return `:only-of-type`;
  }

  matches(root: Element, element: Element): boolean {
    let p: Element = element.parent();
    if (Objects.isNull(p)) return false;
    else if (p instanceof Document) return false;
    else {
      let family = p.children(), pos = 0;
      for (let el of family) pos++;
      return pos === 1;
    }
  }
}

/**
 * Elements that have no children at all
 * @match `:empty`
 */
export class IsEmpty extends Evaluator {

  toString(): string {
    return `:empty`;
  }

  matches(root: Element, element: Element): boolean {
	  throw Error(`impl`);
    //let family = element.childNodes();
    //return !family.some(n => !(NodeUtils.isComment(n) || NodeUtils.isXmlDeclaration(n) || NodeUtils.isDocumentType(n)))
  }
}

/**
 * Elements that contains the specified text. The search is case insensitive. 
 * The text may appear in the found element, or any of its descendants.
 * @match `:contains(text)`
 * @examp `p:contains(jsoup)` finds p elements containing the text "jsoup".
 */
export class ContainsText extends Evaluator {

  constructor(private searchText: string) {
    super();
    this.searchText = Normalizer.lowerCase(searchText);
  }

  toString(): string {
    return `:contains(${this.searchText})`;
  }

  matches(root: Element, element: Element): boolean {
    return Normalizer.lowerCase(element.text()).includes(this.searchText);
  }

}

/**
 * Elements that contains the specified data. The contents of script and style elements, 
 * and comment nodes (etc) are considered data nodes, not text nodes. The search is case insensitive. 
 * The data may appear in the found element, or any of its descendants.
 * @match `:containsData(data)`
 * @examp `script:contains(jsoup)` finds script elements containing the data "jsoup".
 */
export class ContainsData extends Evaluator {

  constructor(private searchText: string) {
    super();
    this.searchText = Normalizer.lowerCase(searchText);
  }

  toString(): string {
    return `:containsData(${this.searchText})`;
  }

  matches(root: Element, element: Element): boolean {
    return Normalizer.lowerCase(element.data()).includes(this.searchText);
  }
}

/**
 * Elements that directly contain the specified text. The search is case insensitive. 
 * The text must appear in the found element, not any of its descendants.
 * @match `:containsOwn(text)`
 * @examp `p:containsOwn(jsoup)` finds p elements with own text "jsoup".
 */
export class ContainsOwnText extends Evaluator {

  constructor(private searchText: string) {
    super();
    this.searchText = Normalizer.lowerCase(searchText);
  }

  toString(): string {
    return `:containsOwn(${this.searchText})`;
  }

  matches(root: Element, element: Element): boolean {
    return Normalizer.lowerCase(element.ownText()).includes(this.searchText);
  }

}

/**
 * Elements whose text matches the specified regular expression. 
 * The text may appear in the found element, or any of its descendants.
 * @match `:matches(regex)`
 * @examp
 * - `td:matches(\\d+)` finds table cells containing digits. 
 * - `div:matches((?i)login)` finds divs containing the text, case insensitively.
 */
export class Matches extends Evaluator {
  private readonly regex: RegExp;

  constructor(pattern: string | RegExp) {
    super();
    this.regex = new RegExp(pattern);
  }

  toString(): string {
    return `:matches(${this.regex})`;
  }

  matches(root: Element, element: Element): boolean {
    return this.regex.test(element.text());
  }

}

/**
 * elements whose own text matches the specified regular expression. 
 * The text must appear in the found element, not any of its descendants.
 * @match `:matchesOwn(regex)`
 * @examp
 * - `td:matchesOwn(\\d+)` finds table cells directly containing digits. 
 * - `div:matchesOwn((?i)login)` finds divs containing the text, case insensitively.
 */
export class MatchesOwn extends Evaluator {
  private readonly regex: RegExp;

  constructor(pattern: string | RegExp) {
    super();
    this.regex = new RegExp(pattern);
  }

  toString(): string {
    return `:matchesOwn(regex)`;
  }

  matches(root: Element, element: Element): boolean {
    return this.regex.test(element.ownText());
  }

}

/**
 * treats text nodes as elements, and so allows you to match against and select text nodes.
 * `Note` that using this selector will modify the DOM, so you may want to clone your document before using.
 * @match `:matchText`
 * @examp `p:matchText:firstChild` with input <p>One<br />Two</p> will return one PseudoTextElement with text "One".
 */
export class MatchText extends Evaluator {

  toString(): string {
    return `:matchText`;
  }

  matches(root: Element, element: Element): boolean {
	  if(element.nodeType === NodeType.PseudoText)return true;
	  else	{
     	let textNodes = element.textNodes();
		for(let node of textNodes) {
    		let tag = TagNode.valueOf(element.tagName());
    		let pel = new PseudoText(tag, element.getBaseUri(), element.attributes());
     		node.replaceWith(pel);
			pel.appendChild(node);
     	}
		return false;
	  }
	  
  }

}


//-----------------------------------------------------
//	Structural evaluator.
//----------------------------------------------------

export abstract class StructuralEvaluator extends Evaluator {
  evaluator: Evaluator;
}

export class Root extends StructuralEvaluator {

  matches(root: Element, element: Element): boolean {
    return root === element;
  }

  toString(): string {
    throw new Error("Method not implemented.");
  }

}

export class Has extends StructuralEvaluator {

  constructor(evaluator: Evaluator) {
    super();
    this.evaluator = evaluator;
  }

  matches(root: Element, element: Element): boolean {
    return element.getAllElements().some(el => el !== element && this.evaluator.matches(element, el));
  }

  toString(): string {
    return `:has(${this.evaluator})`;
  }

}

export class Not extends StructuralEvaluator {

  constructor(evaluator: Evaluator) {
    super();
    this.evaluator = evaluator;
  }

  matches(root: Element, element: Element): boolean {
    return !this.evaluator.matches(root, element);
  }

  toString(): string {
    return `:not(${this.evaluator})`;
  }

}

export class Parent extends StructuralEvaluator {

  constructor(evaluator: Evaluator) {
    super();
    this.evaluator = evaluator;
  }

  matches(root: Element, element: Element): boolean {
    if (root === element) return false;
    else {
      let parent = element.parent();
      while (parent != null) {
        if (this.evaluator.matches(root, parent)) return true;
        if (parent === root) break;
        parent = parent.parent();
      }
      return false;
    }
  }

  toString(): string {
    return `${this.evaluator} `;
  }

}

export class ImmediateParent extends StructuralEvaluator {

  constructor(evaluator: Evaluator) {
    super();
    this.evaluator = evaluator;
  }

  matches(root: Element, element: Element): boolean {
    if (root === element) return false;
    else {
      let parent = element.parent();
      return Objects.notNull(parent) && this.evaluator.matches(root, parent);
    }
  }

  toString(): string {
    return `${this.evaluator} > `;
  }

}

export class PreviousSibling extends StructuralEvaluator {

  constructor(evaluator: Evaluator) {
    super();
    this.evaluator = evaluator;
  }

  matches(root: Element, element: Element): boolean {
    if (root === element) return false;
    else {
      let prev = element.previousElementSibling();
      while (Objects.notNull(prev)) {
        if (this.evaluator.matches(root, prev)) return true;
        prev = prev.previousElementSibling();
      }
      return false;
    }
  }

  toString(): string {
    return `${this.evaluator} ~`;
  }

}

export class ImmediatePreviousSibling extends StructuralEvaluator {

  constructor(evaluator: Evaluator) {
    super();
    this.evaluator = evaluator;
  }

  matches(root: Element, element: Element): boolean {
    if (root === element) return false;
    else {
      let prev = element.previousElementSibling();
      return Objects.notNull(prev) && this.evaluator.matches(root, prev);
    }
  }

  toString(): string {
    return `${this.evaluator} + `;
  }

}
