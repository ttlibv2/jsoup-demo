import { NgModule, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { HttpClientModule } from "@angular/common/http";
import {OdUser} from './odoo/service/OdUser';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import {TsInterceptor} from './cookie';
import {LocalStorage, Crypto} from './service/LocalStorage';
import * as CryptoJS from 'crypto-js'; 

class CryptoJSAES extends Crypto {
	
	get privateKey(): string {
		return `!!@@abc123@@!!`;
	}
	
	encrypt(str: string): string {
		return CryptoJS.AES.encrypt(str, this.privateKey).toString();
	}
	
	decrypt(str: string): string {
		return CryptoJS.AES.decrypt(str, this.privateKey).toString(CryptoJS.enc.Utf8);
	}
	
}

export function LOAD_CFIG(storage: LocalStorage, odUser: OdUser) {
	return () => storage.init(new CryptoJSAES()).then(it => {
		console.log(`Đọc dữ liệu local`);
		console.log(it.toJson());
		odUser.clsUser = it.get('clsUser');
	}).catch(msg => console.error(msg));
}



@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
	  HttpClientModule
  ],
  providers: [
  {provide:  HTTP_INTERCEPTORS, useClass: TsInterceptor, multi: true},
  { provide: APP_INITIALIZER, useFactory: LOAD_CFIG, deps: [LocalStorage, OdUser], multi: true },
	OdUser, LocalStorage
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
