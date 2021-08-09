/*eslint-disable */
import { ArrayList } from "../js/helper/ArrayList";
import { HashMap } from "../js/helper/HashMap";
import { ObjectMap } from "../js/helper/ObjectMap";
import { Objects } from "../js/helper/Objects";

function assign(target: any, source: any): any {
  for (let prop in source) {
    if (prop in this) this[prop] = source[prop];
    else target.set(prop, source[prop]);
  }
}

export abstract class ClsModel {
  static readonly NAME_FIELD = new HashMap<string, number>()
    .set("id", 0)
    .set("name", 1)
    .set("display_name", 1);

  customObj = new ObjectMap();

  set(key: string, value: any): this {
    this.customObj.set(key, value);
    return this;
  }

  assign(o: any): this {
    assign(this, o);
    return this;
  }

  cloneMap(): ObjectMap {
    return this.customObj.clone().putObject(this, ["customObj"]);
  }

  static arrToObject(arr: any[] | any, fields?: HashMap<string, number>) {
    if (arr === "false") return new HashMap();
    else {
      fields = fields || ClsModel.NAME_FIELD;
      return fields.map((key, index) => [key, arr[index]]);
    }
  }
}

export class ClsNameSearchOption extends ClsModel {
  limit: number;
  url: string;
  args: any;
}

export class ClsNote extends ClsModel {
  partner_ids: ArrayList<any> = new ArrayList();
  attachment_ids: ArrayList<any> = new ArrayList();
  canned_response_ids: ArrayList<any> = new ArrayList();

  id: number;
  body: string;
  message_type: string = "comment";
  subtype: string = "mail.mt_note";
  attachmentObj: any;

  withID(nodeId: number): this {
    this.id = nodeId;
    return this;
  }

  addAttachment_ids(fieldIds: any[]): this {
    this.attachment_ids.addAll(fieldIds);
    return this;
  }
}

export class ClsRequest extends ClsModel {
  jsonrpc: string = "2.0";
  id: number = Date.now();
  method: string;
  params: any;
}

export class ClsResponse extends ClsModel {
  jsonrpc: string = "2.0";
  id: number;
  result: any;
  error: any;
}

export class ClsSearchReadOption extends ClsModel {
  filterOptions: ClsFilterOption = new ClsFilterOption();
  contextData = new ObjectMap();
}

export class ClsStage extends ClsModel {
  id: number;
  sequence: string;
  name: string;
  display_name: string;
}

export class ClsTopic extends ClsModel {
  id: number;
  sequence: number;
  display_name: string;
  category_id: any[];
  create_date: string;
  create_uid: any[];
}

export class ClsWkTeam extends ClsModel {
  id: number;
  sequence: number;
  display_name: string;
  child_ids: any[];
  create_uid: string;
  manager: any[];
  department_id: any;
  description: string;
  members: number[];
  team_email: string;
}

export class ClsCategory extends ClsModel {
  id: number;
  sequence: number;
  name: string;
  display_name: string;
  default_team_id: any[]; // [id,display_name]
  manager_id: any[]; // [id,display_name]
  create_uid: any[]; // [id,display_name]
  create_date: string;
  wk_team: ClsWkTeam;
  manager: ClsUser;

  assign(obj: any): this {
    super.assign(obj);
    this.createWk_team();
    this.createManager();
    if (Objects.isEmpty(this.display_name)) {
      this.display_name = this.name;
    }
    return this;
  }

  createWk_team(): ClsWkTeam {
    if (Objects.notNull(this.wk_team)) return this.wk_team;
    else {
      let obj = ClsModel.arrToObject(this.default_team_id);
      this.wk_team = new ClsWkTeam().assign(obj);
      this.default_team_id = null;
      return this.wk_team;
    }
  }

  createManager(): ClsUser {
    if (Objects.notNull(this.manager)) return this.manager;
    else {
      let obj = ClsModel.arrToObject(this.manager_id);
      this.wk_team = new ClsWkTeam().assign(obj);
      this.manager_id = null;
      return this.manager;
    }
  }
}

export class ClsFilterOption extends ClsModel {
  operator: string = "ilike";
  isOr: boolean;
}

export class ClsPage extends ClsModel {
  limit: number;
  sort: boolean;
}

export class ClsPartner extends ClsModel {
  id: number;
  name: string;
  display_name: string;
  email: string;
  is_company: boolean = false;
  phone: string;
  mobile: string;
  street: string;
  type: string = "contact";
  vat: string;
  active: boolean = false;
  company_type: string;
  parent_id: any;

  comp_id: number;
  comp_name: string;

  customer_name: string;
  customer_id: number;
}

export enum ClsTicketAction {}

export class ClsTicketLog {
  message: string;
  status: string;
  action: ClsTicketAction;
  ticket_id: number;
}

export class ClsLogOption extends ClsModel {
  ticket: ClsTicket;
  action: ClsTicketAction;

  toLog(): ClsTicketLog {
    let num = this.ticket.id;
    let log = new ClsTicketLog();
    log.ticket_id = num;
    log.action = this.action;
    log.status = 'ok';
    log.message = `[${this.ticket.id}] ${this.action} -> ${num}`;
    return log;
  }
}

export class ClsTicket extends ClsModel {
  id: number;
  name: string;
  display_name: string;
  subject: string;
  partner_id: any;
  category_id: string; // | [id,name]
  priority: string; // độ tiên
  stage_id: any; // id | [id,name]
  user_id: string;
  create_date: string;
  company_id: string;
  team_id: string;
  topic_id: string;

  cloneMap() {
    return super.cloneMap().set('priority', this.priority);
  }
}

export class ClsUserContext extends ClsModel {
  
  uid: number;
  tz: string;
  lang: string;

  set_if_absent(context: ClsUserContext) {
    this.uid = this.uid || context.uid;
    this.tz = this.tz || context.tz;
    this.lang = this.lang || context.lang;
    this.customObj.putAllIfAbsent(context.customObj);
    return this;
  }

}

export class ClsUser extends ClsModel {
  display_name: string;

  tz_offset: string;
  company_id: any;
  parent_id: any[];// [id,name]
  signature: string;
  user_name: string;
  passwd: string;

  id: number;
  name: string;
  email: string;
  partner_id: number;
  selected: boolean;

  context: ClsUserContext;
  csrf_token: string;
  cookie: string;

  assign(obj: any): this{
    super.assign(obj);
    this.display_name = this.display_name || this.name;
    this.context = new ClsUserContext().assign(this.context);
    return this;
  }


}
