import { Objects } from "../helper/Objects";

/**
 * Util methods for normalizing strings. Jsoup internal use only, please don't depend on this API.
 */
export class Normalizer {
  static lowerCase(input: string): string {
    return Objects.isNull(input) ? "" : input.toLowerCase();
  }

  static normalize(input: string, isStringLiteral?: boolean): string {
    let text = Normalizer.lowerCase(input);
    return isStringLiteral ? text : text.trim();
  }
}
