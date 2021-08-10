import { HttpClient } from "@angular/common/http";
import { Injectable, Type } from "@angular/core";
import { Objects } from "../../js/helper/Objects";
import { ObjectMap } from "../../js/helper/ObjectMap";
import { ClsModel, ClsNameSearchOption, ClsPage, ClsSearchReadOption, ClsUser } from "../Model";
import { OdHelper } from "../Helper";
import { Assert } from "../../js/helper/Assert";
import {switchMap} from 'rxjs/operators';
import { Observable, of } from "rxjs";

@Injectable({providedIn: 'root'})
export abstract class OdCore {
  static UrlRoot: string = 'https://web.ts24.com.vn/web';
  private clsUser_: ClsUser;

  abstract get basePath(): string;
  abstract get model(): string;

  constructor(protected readonly client: HttpClient){}

  set clsUser(clsUser: any) {
    this.clsUser_ = Objects.isNull(clsUser) ? null : clsUser instanceof ClsUser ? clsUser : new ClsUser().assign(clsUser);
  }
  
  get clsUser():ClsUser {
	  Assert.notNull(this.clsUser_, `@clsUser is null -> please set user`);
	  return this.clsUser_;
  }
  


  protected getFields(key: string, modelName?: string) {
    modelName = modelName || this.model;
    return OdHelper.OdFieldObject.fields[modelName][key];
  }

  /**
   * Return url api
   * @param {string[]} paths
   * @return {string}
   */
  protected joinUrl(...paths: string[]): string {
    if(Objects.isEmpty(paths)) return OdCore.UrlRoot;
    else {
      let path = paths.join('/');
      if(path.startsWith('https://')) return path;
      else return OdCore.UrlRoot + '/' + path;
    }
  }

  /**
   * Return url with `basePath = dataset`
   * @param {string} path 
   */
  protected datasetUrl(path: string): string {
    return this.joinUrl('dataset', path);
  }

  protected fixContext(): ObjectMap {
    return OdHelper.fixContext(this.clsUser).cloneMap();
  } 

  /**
   * 
   * @param url 
   * @param payload 
   * @param options {returnType?: string}
   */
  sendPost(url: string, payload: any, option?: any): Observable<any> {
    let optionMap = OdHelper.fixOption(this.clsUser, option);
    
    // fix return type
    let returnType = optionMap.remove('returnType') || ObjectMap;
    if(returnType === String) optionMap.set('responeType', 'text');

    payload = OdHelper.fixBody(payload);
    let newOption = optionMap.toJson();
    return this.client.post(url, payload, newOption);
  }

  /**
   * Returns detail
   * @param args any
   */
  read(args: any[]): Observable<ObjectMap[]> {
    let url = this.datasetUrl(this.basePath + '/read');
    let context = this.fixContext().toJson();
    let convert = (resp: ObjectMap) => of(resp.get_maps('result'));
    return this.sendPost(url, ObjectMap.create()
      .set('method', 'read')
      .set('model', this.model)
      .set('args', args)
      .set('kwargs', { context: context }))
      .pipe(switchMap(convert))

  }

  /**
   * Search by name. Path: `call_kw/{model}/name_search`
   * @param {string} keyword string
   * @param {ClsNameSearchOption} option any => {limit, url, kwargs_args} `(Optional)`
   */
  nameSearch<T extends ClsModel>(keyword: string, clsOption: ClsNameSearchOption, clsModel: Type<T>): Observable<T[]> { 
    clsOption = clsOption || new ClsNameSearchOption();
    clsOption.limit = clsOption.limit || 80;
    keyword = keyword || '';
    
    let url = clsOption.url || this.datasetUrl(this.basePath + '/name_search');
    let context = this.fixContext().toJson();
    let kwargs = { name: keyword, args: clsOption.args, context: context,  operator: 'ilike', limit: clsOption.limit };
    let convert = (resp: ObjectMap) => of(resp.get_maps('result')
                                            .map(m => new clsModel()
                                            .assign(ClsModel.arrToObject(m))));

    return this.sendPost(url, ObjectMap.create()
      .set('args', [])
      .set('method', 'name_search')
      .set('model', this.model)
      .set('kwargs', kwargs))
      .pipe(switchMap(convert));
  }

  /**
   * Search with filter. Path `/{search_read}`
   * @param {ClsPage} clsPage -> {limit, sort}
   * @param option -> {filterOptions, contextData}
   */
  searchRead<T extends ClsModel>(filter: ObjectMap, clsPage: ClsPage, clsOption: ClsSearchReadOption, clsModel: Type<T>): Observable<T[]> {
    clsOption = clsOption || new ClsSearchReadOption();
    filter = filter || ObjectMap.create();
    clsPage = OdHelper.fixPage(clsPage);

    // remove query [size]
    filter.remove('size');
    
    let context = this.fixContext().putAll(clsOption.contextData);
    let query = OdHelper.fixQuery(filter, clsOption.filterOptions);
    let payload = ObjectMap.create()
      .set('model', this.model)
      .set('context', context.toJson())
      .set('domain', query)
      .set('fields', this.getFields('find', null))
      .putAll(clsPage.cloneMap());

    let url = this.datasetUrl('search_read');
    let convert = (resp: ObjectMap) => of(resp.get_map('result').get_maps('records').map(o => new clsModel().assign(o)));
    return this.sendPost(url, payload).pipe(switchMap(convert));
  }











}