import { Component } from '@angular/core';
import { Jsoup } from "./js/Jsoup";
//import { Document } from "./js/nodes/Document";
import { HttpClient } from "@angular/common/http";
import { Node } from './js/nodes/1004_Node';
@Component({ 
  selector: 'cy-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent { 
  title = 'angularcli';
  html: string = undefined;
  msg: string = undefined;
  
  constructor(private client: HttpClient) {
	  this.initHtml();
  }
  
  private initHtml() {
	   let url = "/web/login"; 
    let headers = {
      // "Access-Control-Allow-Headers": "*"
      // "Access-Control-Allow-Credentials": "true",
      //"x-requested-with": "XMLHttpRequest",
      // Cookie: "session_id=hfehfkerhkhgrihgirhegkhrkgh"
    };
	  this.client.get(url, { responseType: "text", headers }).subscribe((doc) => this.html = doc);
  }

  signIn(str?: string): void { 
	let arr = new Array(2);
	arr.push(123);
	
	

	this.jsoupDemo(this.html, str);
  }
  
  private jsoupDemo(html: string, str: string) {
	  let doc = Jsoup.parse(html);
	  let el = doc.body()
		  .select(str.trim());
	  
	  //console.log(el.size());
	  this.printFirst(el);
  }
  
  printFirst(el: any) {
	  this.msg = el.all().map((n,i) => `<p>${i+1}: ${n.tag().tagName}${n.attributes().toString()}
		<br>${n.text()}</p>`).join('<br/><br/>');
  }
 
}
