import { HttpClient } from "@angular/common/http";
import { Component } from "@angular/core";
import { Jsoup } from "./js/Jsoup";
import { Document } from "./js/nodes/Document";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"]
})
export class AppComponent {
  title = "Angular CLI Template";

  constructor(private client: HttpClient) {}

  signIn(): void {
    let url = "/web/login";
    let headers = {
      // "Access-Control-Allow-Headers": "*"
      // "Access-Control-Allow-Credentials": "true",
      // "x-requested-with": "XMLHttpRequest",
      //Cookie: "session_id=hfehfkerhkhgrihgirhegkhrkgh"
    };

    this.client.get(url, { responseType: "text" }).subscribe((html) => {
      //console.log(html);
      let doc: Document = Jsoup.parse(html);
    });
  }
}
