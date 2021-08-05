import { Component } from '@angular/core';
import { Jsoup } from "./js/Jsoup";
//import { Document } from "./js/nodes/Document";
import { HttpClient } from "@angular/common/http";
@Component({ 
  selector: 'cy-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent { 
  title = 'angularcli';
  
  constructor(private client: HttpClient) {}

  signIn(): void {
	  
	  
	  let url = "/web/login";
    let headers = {
      // "Access-Control-Allow-Headers": "*"
      // "Access-Control-Allow-Credentials": "true",
      // "x-requested-with": "XMLHttpRequest",
      // Cookie: "session_id=hfehfkerhkhgrihgirhegkhrkgh"
    };

    this.client.get(url, { responseType: "text", headers }).subscribe((html) => {
      //console.log(html);
      let doc = Jsoup.parse(html);
      console.log(doc.select('form').eq(1));
    });
  }
  
}
