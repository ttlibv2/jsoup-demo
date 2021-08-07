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
  
  constructor(private client: HttpClient) {}

  signIn(): void { 
	let html = `<form class="oe_login_form" role="form" method="post" onsubmit="this.action = this.action + location.hash" action="/web/login">
					<input type="hidden" name="csrf_token" value="4aafb79c94d70416851fc54c6218b3a0bfff5ad6o1628257114">
					<div class="form-group field-login">
						<label for="login">Email</label>
						<input type="text" placeholder="Email" name="login" id="login" required="required" autofocus="autofocus" autocapitalize="off" class="form-control ">
					</div>
					<div class="form-group field-password">
						<label for="password">Password</label>
						<input type="password" placeholder="Password" name="password" id="password" required="required" autocomplete="current-password" maxlength="4096" class="form-control ">
					</div>
					<div class="clearfix oe_login_buttons text-center mb-1 pt-3">
						<button type="submit" class="btn btn-primary btn-block">Log in</button>
						<div class="justify-content-between mt-2 d-flex small">
							<a href="/web/signup?">Don't have an account?</a>
							<a href="/web/reset_password?">Reset Password</a>
						</div>
					</div>
				</form>`;
				
	let doc = Jsoup.parse(html);
	let els = doc.select('form');
	console.log(els.html());
	  
	  //let url = "/web/login"; 
    //let headers = {
      // "Access-Control-Allow-Headers": "*"
      // "Access-Control-Allow-Credentials": "true",
      //"x-requested-with": "XMLHttpRequest",
      // Cookie: "session_id=hfehfkerhkhgrihgirhegkhrkgh"
    //};

    //this.client.get(url, { responseType: "text", headers }).subscribe((html) => {
    //  console.log(html);

    //  console.log(`parse html.......................`);
    //  let doc = Jsoup.parse(html);
    //  console.log(doc.html());
    //});
  }

 
}
