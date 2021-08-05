import { Assert } from "../helper/Assert";
import { TokenQueue } from "../parse/TokenQueue";
import * as NSEvaluator from "./Evaluator";
import { ArrayList } from "../helper/ArrayList";
import { Normalizer } from "../helper/Normalizer";
import { SelectorParseError } from "./Selector";
import { Objects } from "../helper/Objects";
import { StringBuilder } from "../helper/StringBuilder";
import { Char } from "../helper/Char";

/**
 * Parses a CSS selector into an Evaluator tree.
 */
export class QueryParser {
  static readonly combinators: string[] = [",", ">", "+", "~", " "];
  static readonly AttributeEvals: string[] = [
    "=",
    "!=",
    "^=",
    "$=",
    "*=",
    "~="
  ];
  static readonly NTH_AB: RegExp = /(([+-])?(\d+)?)n(\s*([+-])?\s*\d+)?/;
  static readonly NTH_B: RegExp = /([+-])?(\d+)/;

  readonly tq: TokenQueue;
  readonly query: string;
  readonly evals: ArrayList<NSEvaluator.Evaluator>;

  /**
   * Create a new QueryParser.
   * @param query CSS query
   */
  private constructor(query: string) {
    Assert.notEmpty(query);
    this.query = query.trim();
    this.tq = new TokenQueue(query);
    this.evals = new ArrayList();
  }

  /**
   * Parse a CSS query into an Evaluator.
   * @see Selector selector query syntax
   * @param query CSS query
   * @return `Evaluator`
   */
  static parse(query: string): NSEvaluator.Evaluator {
    return new QueryParser(query).parse();
  }

  /**
   * Parse the query
   * @return Evaluator
   */
  parse(): NSEvaluator.Evaluator {
    this.tq.consumeWhitespace();

    if (this.tq.matchesAny(QueryParser.combinators)) { // if starts with a combinator, use root as elements
      this.evals.add(new NSEvaluator.Root());
      this.combinator(this.tq.consume());
    } //
    else  this.findElements();
    
    while (!this.tq.isEmpty()) {
      // hierarchy and extras
      let seenWhite = this.tq.consumeWhitespace();

      if (this.tq.matchesAny(QueryParser.combinators))this.combinator(this.tq.consume());
      else if (seenWhite)  this.combinator(' ');

      // E.class, E#id, E[attr] etc. AND
      else this.findElements(); // take next el, #. etc off queue
    }

    if (this.evals.size() === 1) {
      return this.evals.get(0);
    }

    return new NSEvaluator.And(this.evals);
  }

  protected combinator(string: string): void {
    let combinator: Char = Char.of(string);
    this.tq.consumeWhitespace();
    let subQuery = this.consumeSubQuery(); // support multi > childs

    let rootEval: NSEvaluator.Evaluator; // the new topmost evaluator
    let currentEval: NSEvaluator.Evaluator; // the evaluator the new eval will be combined to. could be root, or rightmost or.
    let newEval: NSEvaluator.Evaluator = QueryParser.parse(subQuery); // the evaluator to add into target evaluator
    let replaceRightMost: boolean = false;

    if (this.evals.size() === 1) {
      rootEval = currentEval = this.evals.get(0);
      // make sure OR (,) has precedence:
      if (rootEval instanceof NSEvaluator.Or && !combinator.equals(",")) {
        let comb: NSEvaluator.Or = rootEval;
        currentEval = comb.rightMostEvaluator();
        Assert.notNull(currentEval); // rightMost signature can return null (if none set), but always will have one by this point
        replaceRightMost = true;
      }
    } else {
      rootEval = currentEval = new NSEvaluator.And(this.evals);
    }

    //
    this.evals.clear();

    // for most combinators: change the current eval into an AND of the current eval and the new eval
    if (combinator.equals(">")) {
      let evalu = new NSEvaluator.ImmediateParent(currentEval);
      currentEval = new NSEvaluator.And([evalu, newEval]);
    } 
    else if (combinator.equals(" ")) {
      let evalu = new NSEvaluator.Parent(currentEval);
      currentEval = new NSEvaluator.And([evalu, newEval ]);
    } 
    else if (combinator.equals("+")) {
      let evalu = new NSEvaluator.ImmediatePreviousSibling(currentEval);
      currentEval = new NSEvaluator.And([evalu, newEval]);
    } 
    else if (combinator.equals("~")) {
      let evalu = new NSEvaluator.PreviousSibling(currentEval);
      currentEval = new NSEvaluator.And([evalu, newEval]);
    } 
    else if (combinator.equals(",")) {
      let nsOr = currentEval instanceof NSEvaluator.Or;
      let or: NSEvaluator.Or = nsOr ? <any>currentEval : new NSEvaluator.Or([currentEval]);
      or.add(newEval);
      currentEval = or;
    } 
    else throw new SelectorParseError("Unknown combinator: " + combinator);

    if (replaceRightMost) {
      let evalu: NSEvaluator.Or = <any>rootEval;
      evalu.replaceRightMostEvaluator(currentEval);
    } //
    else rootEval = currentEval;
    this.evals.add(rootEval);
  }

  protected consumeSubQuery(): string {
    let sq = new StringBuilder();
    while (!this.tq.isEmpty()) {
      if (this.tq.matches("(")) {
        sq.append("(").append(this.tq.chompBalanced("(", ")")).append(")");
      } else if (this.tq.matches("[")) {
        sq.append("[").append(this.tq.chompBalanced("[", "]")).append("]");
      } else if (this.tq.matchesAny(QueryParser.combinators)) {
        if (sq.length > 0) break;
        else this.tq.consume();
      } else sq.append(this.tq.consume());
    }
    return sq.toString();
  }

  protected findElements(): void {
    if (this.tq.matchChomp("#")) this.byId();
    else if (this.tq.matchChomp(".")) this.byClass();
    else if (this.tq.matchesWord() || this.tq.matches("*|")) this.byTag();
    else if (this.tq.matches("[")) this.byAttribute();
    else if (this.tq.matchChomp("*")) this.allElements();
    else if (this.tq.matchChomp(":lt(")) this.indexLessThan();
    else if (this.tq.matchChomp(":gt(")) this.indexGreaterThan();
    else if (this.tq.matchChomp(":eq(")) this.indexEquals();
    else if (this.tq.matches(":has(")) this.has();
    else if (this.tq.matches(":contains(")) this.contains(false);
    else if (this.tq.matches(":containsOwn(")) this.contains(true);
    else if (this.tq.matches(":containsData(")) this.containsData();
    else if (this.tq.matches(":matches(")) this.matches(false);
    else if (this.tq.matches(":matchesOwn(")) this.matches(true);
    else if (this.tq.matches(":not(")) this.not();
    else if (this.tq.matchChomp(":nth-child(")) this.cssNthChild(false, false);
    else if (this.tq.matchChomp(":nth-last-child("))  this.cssNthChild(true, false);
    else if (this.tq.matchChomp(":nth-of-type(")) this.cssNthChild(false, true);
    else if (this.tq.matchChomp(":nth-last-of-type(")) this.cssNthChild(true, true);
    else if (this.tq.matchChomp(":first-child")) this.evals.add(new NSEvaluator.IsFirstChild());
    else if (this.tq.matchChomp(":last-child")) this.evals.add(new NSEvaluator.IsLastChild());
    else if (this.tq.matchChomp(":first-of-type")) this.evals.add(new NSEvaluator.IsFirstOfType());
    else if (this.tq.matchChomp(":last-of-type")) this.evals.add(new NSEvaluator.IsLastOfType());
    else if (this.tq.matchChomp(":only-child")) this.evals.add(new NSEvaluator.IsOnlyChild());
    else if (this.tq.matchChomp(":only-of-type")) this.evals.add(new NSEvaluator.IsOnlyOfType());
    else if (this.tq.matchChomp(":empty")) this.evals.add(new NSEvaluator.IsEmpty());
    else if (this.tq.matchChomp(":root")) this.evals.add(new NSEvaluator.IsRoot());
    else if (this.tq.matchChomp(":matchText")) this.evals.add(new NSEvaluator.MatchText());
   
    // unhandled
    else { 
      let msg = `Could not parse query '${this.query}': unexpected token at '${this.tq.remainder()}'`;
      throw new SelectorParseError(msg);
    }
  }

  protected byId(): void {
    let id = Assert.notEmpty(this.tq.consumeCssIdentifier());
    this.evals.add(new NSEvaluator.Id(id));
  }

  protected byClass(): void {
    let className = Assert.notEmpty(this.tq.consumeCssIdentifier());
    this.evals.add(new NSEvaluator.Class(className.trim()));
  }

  protected byTag(): void {
    // todo - these aren't dealing perfectly with case sensitivity. For case sensitive parsers, we should also make
    // the tag in the selector case-sensitive (and also attribute names). But for now, normalize (lower-case) for
    // consistency - both the selector and the element tag
    let tagName = Normalizer.normalize(this.tq.consumeElementSelector());
    Assert.notEmpty(tagName);

    // namespaces: wildcard match equals(tagName) or ending in ":"+tagName
    if (tagName.startsWith("*|")) {
      let plainTag = tagName.substring(2); // strip *|
      this.evals.add(
        new NSEvaluator.Or([
          new NSEvaluator.Tag(plainTag),
          new NSEvaluator.TagEndsWith(tagName.replace("*|", ":"))
        ])
      );
    }

    // namespaces: if element name is "abc:def", selector must be "abc|def", so flip:
    else {
      if (tagName.includes("|")) {
        tagName = tagName.replace("|", ":");
      }
      this.evals.add(new NSEvaluator.Tag(tagName));
    }
  }

  protected byAttribute(): void {
    let cq = new TokenQueue(this.tq.chompBalanced("[", "]")); // content queue
    let key = cq.consumeToAny(QueryParser.AttributeEvals); // eq, not, start, end, contain, match, (no val)
    Assert.notEmpty(key);

    cq.consumeWhitespace();

    if (cq.isEmpty()) {
      if (key.startsWith("^"))
        this.evals.add(new NSEvaluator.AttributeStarting(key.substring(1)));
      else this.evals.add(new NSEvaluator.Attribute(key));
    } else {
      if (cq.matchChomp("="))
        this.evals.add(new NSEvaluator.AttributeWithValue(key, cq.remainder()));
      else if (cq.matchChomp("!="))
        this.evals.add(
          new NSEvaluator.AttributeWithValueNot(key, cq.remainder())
        );
      else if (cq.matchChomp("^="))
        this.evals.add(
          new NSEvaluator.AttributeWithValueStarting(key, cq.remainder())
        );
      else if (cq.matchChomp("$="))
        this.evals.add(
          new NSEvaluator.AttributeWithValueEnding(key, cq.remainder())
        );
      else if (cq.matchChomp("*="))
        this.evals.add(
          new NSEvaluator.AttributeWithValueContaining(key, cq.remainder())
        );
      else if (cq.matchChomp("~="))
        this.evals.add(
          new NSEvaluator.AttributeWithValueMatching(key, cq.remainder())
        );
      else
        throw new SelectorParseError(
          `Could not parse attribute query '${
            this.query
          }': unexpected token at '${cq.remainder()}'`
        );
    }
  }

  protected allElements(): void {
    this.evals.add(new NSEvaluator.AllElement());
  }

  // pseudo selectors :lt, :gt, :eq
  protected indexLessThan(): void {
    this.evals.add(new NSEvaluator.IndexLessThan(this.consumeIndex()));
  }

  protected indexGreaterThan(): void {
    this.evals.add(new NSEvaluator.IndexGreaterThan(this.consumeIndex()));
  }

  protected indexEquals(): void {
    this.evals.add(new NSEvaluator.IndexEquals(this.consumeIndex()));
  }

  protected cssNthChild(backwards: boolean, ofType: boolean): void {
    let argS = Normalizer.normalize(this.tq.chompTo(")"));

    //let mAB = QueryParser.NTH_AB.exec(argS);
    //let mB = QueryParser.NTH_B.exec(argS);
    let a: number, b: number;
    if ("old" === argS) {
      a = 2;
      b = 1;
    } else if ("even" === argS) {
      a = 2;
      b = 0;
    } else if (QueryParser.NTH_AB.test(argS)) {
      // a = mAB.group(3) != null ? Integer.parseInt(mAB.group(1).replaceFirst("^\\+", "")) : 1;
      // b = mAB.group(4) != null ? Integer.parseInt(mAB.group(4).replaceFirst("^\\+", "")) : 0;
      throw new Error(`QueryParser.NTH_AB.test(argS)`);
    } else if (QueryParser.NTH_B.test(argS)) {
      // a = 0;
      // b = Integer.parseInt(mB.group().replaceFirst("^\\+", ""));
      throw new Error(`QueryParser.NTH_B.test(argS)`);
    } else {
      throw new SelectorParseError(
        `Could not parse nth-index '${argS}': unexpected format`
      );
    }

    if (ofType)
      if (backwards) this.evals.add(new NSEvaluator.IsNthLastOfType(a, b));
      else this.evals.add(new NSEvaluator.IsNthOfType(a, b));
    else {
      if (backwards) this.evals.add(new NSEvaluator.IsNthLastChild(a, b));
      else this.evals.add(new NSEvaluator.IsNthChild(a, b));
    }
  }

  protected consumeIndex(): number {
    let indexS = this.tq.chompTo(")").trim();
    Assert.isTrue(Objects.isDigit(indexS), "Index must be numeric");
    return Number.parseInt(indexS, 10);
  }

  // pseudo selector :has(el)
  protected has(): void {
    this.tq.consume(":has");
    let subQuery = this.tq.chompBalanced("(", ")");
    Assert.notEmpty(subQuery, ":has(el) subselect must not be empty");
    this.evals.add(new NSEvaluator.Has(QueryParser.parse(subQuery)));
  }

  // pseudo selector :contains(text), containsOwn(text)
  protected contains(own: boolean): void {
    this.tq.consume(own ? ":containsOwn" : ":contains");
    let searchText = TokenQueue.unescape(this.tq.chompBalanced("(", ")"));
    Assert.notEmpty(searchText, ":contains(text) query must not be empty");
    if (own) this.evals.add(new NSEvaluator.ContainsOwnText(searchText));
    else this.evals.add(new NSEvaluator.ContainsText(searchText));
  }

  // pseudo selector :containsData(data)
  protected containsData(): void {
    this.tq.consume(":containsData");
    let searchText = TokenQueue.unescape(this.tq.chompBalanced("(", ")"));
    Assert.notEmpty(searchText, ":containsData(text) query must not be empty");
    this.evals.add(new NSEvaluator.ContainsData(searchText));
  }

  // :matches(regex), matchesOwn(regex)
  protected matches(own: boolean): void {
    this.tq.consume(own ? ":matchesOwn" : ":matches");
    let regex = this.tq.chompBalanced("(", ")"); // don't unescape, as regex bits will be escaped
    Assert.notEmpty(regex, ":matches(regex) query must not be empty");
    if (own) this.evals.add(new NSEvaluator.MatchesOwn(new RegExp(regex)));
    else this.evals.add(new NSEvaluator.Matches(new RegExp(regex)));
  }

  // :not(selector)
  protected not(): void {
    this.tq.consume(":not");
    let subQuery = this.tq.chompBalanced("(", ")");
    Assert.notEmpty(subQuery, ":not(selector) subselect must not be empty");
    this.evals.add(new NSEvaluator.Not(QueryParser.parse(subQuery)));
  }

  toString(): string {
    return this.query;
  }
}
