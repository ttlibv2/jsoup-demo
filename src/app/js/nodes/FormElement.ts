import { Assert } from "../helper/Assert";
import { Objects } from "../helper/Objects";
import { Element } from "./Element";
import { Elements } from "../select/Elements";
import { NodeType } from "./1004_Node";

//export class FormData extends HashMap<string, any> {}

/**
 * A HTML Form Element provides ready access to the form fields/controls that are associated with it.
 * It also allows a form to easily be submitted.
 */
export class FormElement extends Element {
  private readonly elements: Elements = new Elements();

  // /**
  //  * Create a new, standalone form element.
  //  * @param tag        tag of this element
  //  * @param baseUri    the base URI
  //  * @param attributes initial attributes
  //  */
  // constructor(tag: Tag, baseUri: string, attributes: Attributes) {
  //   super(tag, baseUri, attributes);
  //   this.elements = new Elements();
  // }

  get nodeType(): NodeType {
    return NodeType.Form;
  }

  /**
   * Get the list of form control elements associated with this form.
   * @return form controls associated with this element.
   */
  children(): Elements {
    return this.elements;
  }

  /**
   * Add a form control element to this form.
   * @param element form control to add
   * @return this form element, for chaining
   */
  addElement(element: Element): this {
    this.elements.add(element);
    return this;
  }

  removeChild(element: Element) {
    super.removeChild(element);
    this.elements.remove(element);
  }

  /**
   * Prepare to submit this form.
   */
  submit(
    callbackfn: (
      action: string,
      method: string,
      formData: Record<string, any>
    ) => Document
  ): Document {
    let action = this.hasAttr("action")
      ? this.absUrl("action")
      : this.getBaseUri();

    Assert.notEmpty(
      action,
      "Could not determine a form action URL for submit. Ensure you set a base URI when parsing."
    );

    let method = this.attr("method");
    method = Objects.notEmpty(method) ? method : "get";

    // callback
    return callbackfn(action, method, this.formData());
  }

  /**
   * Get the data that this form submits. The returned list is a copy of the data, and changes to the contents of the
   * list will not be reflected in the DOM.
   * @return a list of key vals
   */
  formData(): any {
    let formData: any = {};

    // iterate the form control elements and accumulate their values
    for (let el of this.elements) {
      if (!el.tag().isFormSubmittable()) continue; // contents are form listable, superset of submitable
      if (el.hasAttr("disabled")) continue; // skip disabled form inputs

      let name = el.attr("name");
      if (name.length === 0) continue;

      let type = el.attr("type");
      if (Objects.equalsIgnoreCase(type, "button")) continue; // browsers don't submit these

      if ("select" === el.normalName()) {
        let options = el.select("option[selected]");
        options.forEach((option) => (formData["name"] = option.val()));
        if (options.isEmpty()) {
          let option = el.selectFirst("option");
          if (Objects.notNull(option)) formData["name"] = option.val();
        }
      }

      // only add checkbox or radio if they have the checked attribute
      else if (
        Objects.equalsIgnoreCase(type, "checkbox") ||
        Objects.equalsIgnoreCase(type, "radio")
      ) {
        if (el.hasAttr("checked")) {
          let val = el.val().length > 0 ? el.val() : "on";
          formData["name"] = val;
        }
      }

      // other
      else formData["name"] = el.val();
    }

    return formData;
  }

  //clone(): FormElement {
  //	return <any>super.clone();
  //}
}
