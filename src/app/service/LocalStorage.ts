import { Injectable } from "@angular/core";
import { ObjectMap } from "../js/helper/ObjectMap";
import { Objects } from "../js/helper/Objects";
import { concat, empty, Observable, of, throwError } from "rxjs";
import * as CryptoJS from 'crypto-js'; 

export class Crypto {
	
	get privateKey(): string {
		return null;
	}
	
	encrypt(str: string): string {
		return str;
	}
	
	decrypt(str: string): string {
		return str;
	}
}


@Injectable({providedIn: 'root'})
export class LocalStorage {
  private readonly object: ObjectMap = ObjectMap.create();
  private static readonly DefaultCrypto: Crypto = new Crypto();
  private crypto_: Crypto = LocalStorage.DefaultCrypto;
  
	set crypto(crypto: Crypto) {
		this.crypto_ = crypto || LocalStorage.DefaultCrypto;
	}

	get crypto():Crypto {
		return this.crypto_ || LocalStorage.DefaultCrypto;
	}

	  init(crypto?: Crypto): Promise<any> {
		  if(Objects.notNull(crypto)) this.crypto = crypto;
		  Array(localStorage.length).fill(0).forEach((_,i) => {
			  let encryptKey = localStorage.key(i);
			  let decryptKey = this.crypto.decrypt(encryptKey);
			  this.get(decryptKey);
		  });
		  
		return of(this.object).toPromise();
	  }

  get(key: string): any {
    if(this.object.has(key)) return this.object.get(key);
    else {
      let value = this.decode(key);
      this.object.set(key, value);
      return value;
    }
  }

  set(key: string, value: any) {
	  let encryptKey = this.crypto.encrypt(key);
		localStorage.setItem(encryptKey, this.encode(value));
		return this.object.set(key, value);
  }

  values(): any [] {
    return [...this.object.values()];
  }

  keys(): string[] {
    return [...this.object.keys()];
  }

  remove(key: string): any {
	 let encryptKey = this.crypto.encrypt(key);
    localStorage.removeItem(encryptKey);
    return this.object.remove(key);
  }

  protected decode<T>(key: string): T {
	  let encryptKey = this.crypto.encrypt(key);
    let str = this.crypto.decrypt(localStorage.getItem(encryptKey));
	
    try{
      let json = JSON.parse(str);
      return json['cy_data'] || json;
    }
    catch(e) { return <any> str;}
  }

  protected encode(value: string): string { 
    let str = JSON.stringify({cy_data: value});
	return this.crypto.encrypt(str);
  }





}