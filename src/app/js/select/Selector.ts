import { Assert } from "../helper/Assert";
import { Objects } from "../helper/Objects";
import { HashMap } from "../helper/HashMap";
import { Element } from "../nodes/Element";
import { Elements } from "./Elements";
import { Collector } from "./Collector";
import { Evaluator } from "./Evaluator";
import { QueryParser } from "./QueryParser";

export class SelectorParseError extends Error {}

export abstract class Selector {
  private constructor() {}

  /**
   * Find elements matching selector.
   *
   * @param query CSS selector
   * @param root  root element to descend into
   * @return matching elements, empty if none
   * @throws Selector.SelectorParseException (unchecked) on an invalid CSS query.
   */
  static select(query: string, root: Element): Elements;

  /**
   * Find elements matching selector.
   *
   * @param evaluator CSS selector
   * @param root root element to descend into
   * @return matching elements, empty if none
   */
  static select(evaluator: Evaluator, root: Element): Elements;

  /**
   * Find elements matching selector.
   *
   * @param query CSS selector
   * @param root root elements to descend into
   * @return matching elements, empty if none
   */
  static select(query: string, root: Iterable<Element>): Elements;

  /**
   * @private
   */
  static select(first: string | Evaluator,last: Element | Iterable<Element> ): Elements {
   
    // [Evaluator]
    if (first instanceof Evaluator && last instanceof Element) {
      Assert.notNull(first);
      Assert.notNull(last);
      return Collector.collect(first, last);
    }

    // [string, Element]
    else if (typeof first === "string" && last instanceof Element) {
      Assert.notEmpty(first);
      let evaluator = QueryParser.parse(first);
      return Selector.select(evaluator, last);
    }

    // [string, Iterable<Element>]
    else if (typeof first === "string" && Objects.isIterable(last)) {
      let query = Assert.notEmpty(first);
      let roots = Assert.notNull(last);
	  
	  //console.log(last[0].tag()?.tagName);

      let evaluator = QueryParser.parse(query);
      let elements = new Elements();
      let seenElements: HashMap<Element, Boolean> = new HashMap();

      for (let root of roots) {
        let found = Selector.select(evaluator, root);
        let els = found.filter((el) => Objects.isNull(seenElements.put(el, true)));
        elements.addAll(els);
        //throw Error("HashMap<Element, Boolean> = new HashMap()");
      }

      return elements;
    }

    else throw Error(`@arguments not support.`);
  }

  // exclude set. package open so that Elements can implement .not() selector.
  static filterOut(elements: Elements, outs: Elements): Elements {
    let els = elements.filter((el) => !outs.some((oel) => oel.equals(el)));
    return new Elements(els);
  }

  /**
   * Find the first element that matches the query.
   * @param cssQuery CSS selector
   * @param root root element to descend into
   * @return the matching element, or <b>null</b> if none.
   */
  static selectFirst(cssQuery: string, root: Element): Element {
    Assert.notEmpty(cssQuery);
    return Collector.findFirst(QueryParser.parse(cssQuery), root);
	}
	
}
