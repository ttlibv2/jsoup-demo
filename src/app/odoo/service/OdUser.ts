import { Injectable } from "@angular/core";
import { concat, empty, Observable, of, throwError } from "rxjs";
import { switchMap, delay, concatMap, catchError } from "rxjs/operators";
import { ObjectMap } from "src/app/js/helper/ObjectMap";
import { Jsoup } from "src/app/js/Jsoup";
import { ClsUser } from "../Model";
import { OdCore } from "./OdCore";

@Injectable({providedIn: 'root'})
export class OdUser extends OdCore {

  get basePath(): string {
    return `call_kw/res.users`;
  }

  get model(): string {
    return `res.users`;
  }

  searchUser(keyword: string): Observable<ClsUser[]> {
    return super.nameSearch(keyword, null, ClsUser);
  }

  findById(clsUserId: number) {
    return super.read([clsUserId]).pipe(switchMap((resp: ObjectMap[]) => {
      if(resp.length === 0) return throwError({code: 'no_user', status: 404});
      else  {
        let cls = new ClsUser().assign(resp[0]);
        let comid = Array.isArray(cls.company_id) ? cls.company_id : [cls.company_id];
        cls.set('comp_id', comid[0]);
        cls.set('comp_name', comid[1]);
        return of(cls);
      }
    }));
  }

  joinUrl(...paths: string[]) {
    return super.joinUrl(...paths);
  }
  
  toQuery(map) {
	  console.log(`abc`);
	  return map.toUrl();
  }

  signIn(username: string, password: string) {
    let loginUrl = '/web_login/login';//this.joinUrl('login');
	
    let payload = `login=${username}&password=${password}`;

	//-- B1: load csrf_token + session_id
    return this.loadHtml(loginUrl)
	
		//-- B2: login
		.pipe(switchMap(pl => this.sendLogin(loginUrl, payload + '&'+ pl)
		
		//-- B3: lấy thông tin user
		.pipe(switchMap(p => this.getUserInfo()))));
  }
	
	
	//-- B1: load csrf_token + session_id
	private loadHtml(loginUrl: string) {
		console.log(`B1: load csrf_token + session_id`);
		return this.client.get(loginUrl, {responseType: 'text'}).pipe(switchMap(html => {
			let doc = Jsoup.parse(html);
			let form = doc.selectFirst('form[action=/web/login]');
			let input = form.select('input[type=hidden]').map(e => `${e.attr('name')}=${e.val()}`);
			return of(input.join('&'));
		}));
		
	}
	
	//-- B2: login
	private sendLogin(loginUrl: string, payload: string) {
		console.log(`B2: login`);
		let headers = {'content-type': 'application/x-www-form-urlencoded'};
		return this.client.post(loginUrl, payload, {responseType: 'text', headers})
		.pipe(
			//catchError(err => of({err: err})),
			switchMap(html => {
				
				let jsDoc = Jsoup.parse(html);

		  // login error
		  if (jsDoc.title().includes('Login')) {
			let ps = jsDoc.selectFirst('form[action=/web/login]').select('p.alert.alert-danger');
			if (!ps.isEmpty()) {
			  let msg = ps.get(0).text().trim();
			  if (msg.includes(`Wrong login/password`)) {
				msg = `<b>Tài khoản đăng nhập không đúng.</b>" +
				  "<br> Vui lòng kiểm tra lại !!`;
			  }

			  return throwError({ code: 'login_ts24', status: 401, msg: msg });
			}

		  }

		  // login success
		  return of(payload);
    }));
		
	}
  
	//-- B3: lấy thông tin user
	private getUserInfo() {
		console.log(`B3: lấy thông tin user`);
		let url = '/web_api';
		return this.client.get(url, {responseType: 'text'}).pipe(switchMap(html => {
			let script = Jsoup.parse(html)
				.select('script[type=text/javascript]')
				.map(el => el.data())
				.filter(tx => tx.includes('csrf_token') || tx.includes('session_id'))
				.map(tx => tx.replace('var odoo =', '')
					.replace('csrf_token', `"csrf_token"`)
					.replace(/,\s+}/, '}')    
					.replace('odoo.session_info =','')
					.replace('};', '}')
					.replace(/\n+/gm, '').trim())
					.map(tx => JSON.parse(tx))
					.reduce((o,v) => ({...o,...v}), {});
					
			this.clsUser = new ClsUser().assign(script);
			return of(this.clsUser);
		}));
		
	}
}