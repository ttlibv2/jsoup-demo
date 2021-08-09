import { Injectable } from "@angular/core";
import { concat, empty, Observable, of, throwError } from "rxjs";
import { switchMap } from "rxjs/operators";
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

  signIn(userName: string, passWord: string) {
    let loginUrl = super.joinUrl('login');

    let headers = {'content-type': 'text/html'};
    let option: any = {responseType: 'text', observe: 'response', headers};
    let pageCookie: string = undefined;
    let loginPayload = ObjectMap.create().set('username', userName).set('password', passWord);

    //-- B1: load csrf_token + session_id
    let loginPage = this.client.get(loginUrl, option).pipe(switchMap((resp: any) => {
      document.cookie = pageCookie = resp.headers.get('set-cookie');
      let input: any[] = Jsoup.parse(resp.body)
        .selectFirst('form[action=/web/login]')
        .select('input[type=hidden]')
        .map(el => [el.attr('name'), el.val()]);

        loginPayload.putEntries(input);
        return of({input, cookie: document.cookie});
    }));

    //-- B2: login
    let payload = loginPayload.toJson();
    let sendLogin = this.client.post(loginUrl, payload, option).pipe(switchMap((resp: any) => {
      document.cookie = pageCookie = resp.headers.get('set-cookie');

      let jsDoc = Jsoup.parse(resp.body);

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
      return new Observable<any>();
    }));

    //-- B3: lấy thông tin user
    // let getUser = this.client.get(this.joinUrl()+'?', option).pipe(switchMap((resp: any) => {
    //   let jsDoc = Jsoup.parse(resp.body);

    // }));

    return concat(loginPage, sendLogin);







  }

  

}