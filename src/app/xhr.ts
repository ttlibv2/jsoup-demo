import { BrowserXhr } from "@angular/http";

export class XhrBrowserCustom extends BrowserXhr {
  build(): any {
    let xhr = new XMLHttpRequest();
    xhr.setRequestHeader("", "");
  }
}
