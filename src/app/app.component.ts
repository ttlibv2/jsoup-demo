import { Component, Injector } from "@angular/core";
import { Jsoup } from "./js/Jsoup";
//import { Document } from "./js/nodes/Document";
import { HttpClient } from "@angular/common/http";
import { Node } from "./js/nodes/1004_Node";
import { Inject } from "@angular/compiler/src/core";
import { OdUser } from "./odoo/service/OdUser";
import {LocalStorage} from './service/LocalStorage';
import * as CryptoJS from 'crypto-js'; 

@Component({
  selector: "cy-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"]
})
export class AppComponent {
  title = "angularcli";
  html: string = undefined;
  msg: string = undefined;

  constructor(private client: HttpClient, private inj: Injector) {
    //this.initHtml();
  }

  get odUser(): OdUser {
    return this.inj.get(OdUser);
  }
  
  get local() {
	  return this.inj.get(LocalStorage);
  }

  signIn(str?: string): void {
    this.odUser.signIn('tuan.nq@ts24corp.com', '123456a@').subscribe(res => {
		this.local.set('clsUser', res);
    });
  }




  
  private initHtml() {
    let url = "/web/login";
    let headers = {
      // "Access-Control-Allow-Headers": "*"
      // "Access-Control-Allow-Credentials": "true",
      //"x-requested-with": "XMLHttpRequest",
      // Cookie: "session_id=hfehfkerhkhgrihgirhegkhrkgh"
    };
    this.client
      .get(url, { responseType: "text", headers })
      .subscribe((doc) => (this.html = doc));
  }
 
}
