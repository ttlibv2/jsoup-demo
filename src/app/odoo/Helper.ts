import { Objects } from '../js/helper/Objects';
import {OdError} from './Error';
import { ObjectMap } from '../js/helper/ObjectMap';
import {Ticket} from './base';
import * as odCls from './Model';
import { Assert } from '../js/helper/Assert';

export abstract class OdHelper {
  private constructor() {}

   /**
   * Fix option request send post
   * @param {object} option
   * @return {ObjectMap}
   */
  static fixOption(clsUser: odCls.ClsUser, option?: any): ObjectMap {
    if(Objects.isNull(clsUser)) throw OdError.e400('no_set_user');

    option = Object.assign({headers:{}, params: {}}, option);

    let cookie = clsUser.cookie;
    if (Objects.notEmpty(cookie)) { 
      option.headers.cookie = cookie;
      document.cookie = cookie;
    }

    let csrfToken = clsUser.csrf_token;
    if (Objects.notEmpty(csrfToken)) { 
      option.headers.csrf_token = csrfToken;
    }

    return ObjectMap.create().putObject(option);;
  }

  /**
   * Create json request for body
   * @param body any
   * @return {ClsRequest}
   */
  static fixBody(body: any): odCls.ClsRequest {
    body = ObjectMap.is(body) ? body.toJson(): body;
    return new odCls.ClsRequest().assign({
      id: Date.now(),
      jsonrpc: '2.0',
      method: 'call',
      params: body
    });
  }

  // { tz: user.tz, uid: user.id, lang: user.lang, bin_size: true, ...data };
  static fixContext(clsUser: odCls.ClsUser, context?: odCls.ClsUserContext) {
    context = context || new odCls.ClsUserContext();
    context.set_if_absent(clsUser.context);
    context.set('bin_size', true);
    return context;
  }

  static fixPage(clsPage: odCls.ClsPage): odCls.ClsPage {
    clsPage = clsPage || new odCls.ClsPage();
    clsPage.limit = clsPage.limit || 80;
    return clsPage;
  }

  static fixQuery(query: ObjectMap, clsFilter: odCls.ClsFilterOption): any[] {
    query = query || new ObjectMap();
    clsFilter = clsFilter || new odCls.ClsFilterOption();

    let operator = clsFilter.operator || 'ilike';
    let list: any[] = [...query.entries()].map((k, v) => [k, operator, v]);
  
    if(list.length !== 0 && !!clsFilter.isOr) {
      list.splice(0, 0, '|');
    }

    return list;
  }

  //------------------------

  /**
   * Convert Ticket to ClsTicket
   * @param {ClsUser} clsUser 
   * @param {Ticket} ticket 
   */
  static convertTicket(clsUser: odCls.ClsUser, ticket: Ticket): odCls.ClsTicket {
    let cls = new odCls.ClsTicket();
    cls.stage_id = 1;
    cls.partner_id = ticket.od_khid;
    cls.subject = ticket.subject;
    return cls.set("kanban_state", "normal")
    .set("company_id", clsUser.company_id)
    .set("priority", 1)
    .set("active", true)
    .set("resolve", false)
    .set("cancel", false)
    .set("date_deadline", false)
    .set("message_attachment_count", 0)
    .set("description", ticket.body_html)
    .set("contact_name", ticket.customer_name)
    .set("email", ticket.email)
    .set("user_id", ticket.od_assign.id)
    .set("team_id", ticket.od_wkteam.id)
    .set("category_id", ticket.od_category.id)
    .set("topic_id", ticket.od_topic.id);
  }

  static validateResponseApi(resp: string | ObjectMap, request?: any) {

    let detail = new ObjectMap()
      .set('client_response', resp)
      .set('client_request', request);

    let error = OdError.e500()
      .set_error(detail)
      .set_code('client_error');

    if(Objects.isEmpty(resp)) {
      throw error.set_msg(`checkResponse -> response is null`);
    }

    // [string => html]
    if(Objects.isString(resp) && resp.includes('invalid CSRF token')) {
      throw error.set_code('invalid_csrf_token')
        .set_msg('csrf_token bị sai -> vui lòng cập nhật.');
    }

    // object
    if(resp instanceof ObjectMap && resp.containsKey('error')) {
      let obj = resp.get_map('error');
      let msg = obj.get('message');
      let keyW = obj.get_map('data').get('name');

      if (keyW === 'odoo.http.SessionExpiredException') {
        throw OdHelper.SessionExpired(error);
      }

      else if (keyW === 'odoo.exceptions.AccessError') {
        throw error.set_status(401)
          .set_code("AccessError")
          .set_msg("Rất tiếc, bạn không được phép truy cập tài liệu này");
      }

      else throw error.set_msg(msg);
    }
  }

  static SessionExpired(error: OdError) {
    return error.set_status(401)
      .set_code("SessionExpired")
      .set_msg("<b>Mã kích hoạt đã hết hạn sử dụng. Vui lòng cập nhật để sử dụng tiếp. <br>" +
        "<i class='ps'>P/s: Vào menu [Khác] -> [Mã kích hoạt].</i>");
  }

  static fixImageName(imageName: string): string {
    Assert.notEmpty(imageName, `@imageName must be not null`);
    if(!imageName.includes('.')) imageName += '.png';
    return imageName.toLowerCase();
  }

  static readonly OdFieldObject = {
    "fields": {
      "res.partner": {
        "find": [
          "id",
          "name",
          "display_name",
          "email",
          "phone",
          "mobile",
          "parent_id",
          "vat",
          "is_company",
          "company_type"
        ],
        "detail": [
          "id",
          "name",
          "display_name",
          "email",
          "phone",
          "mobile",
          "parent_id",
          "vat",
          "is_company",
          "company_type"
        ],
        "search_keyword": [
          {
            "key": "vat",
            "label": "MST",
            "operator": null
          },
          {
            "key": "email",
            "label": "Email",
            "operator": null
          },
          {
            "key": "company_name",
            "label": "Tên công ty",
            "operator": null
          },
          {
            "key": "phone",
            "label": "Số điện thoại",
            "operator": null
          }
        ]
      },
      "res.users": {
        "find": [
          "id",
          "name",
          "display_name",
          "email",
          "lang",
          "tz",
          "tz_offset",
          "company_id",
          "signature"
        ],
        "detail": [
          "id",
          "name",
          "display_name",
          "email",
          "lang",
          "tz",
          "tz_offset",
          "company_id",
          "signature"
        ]
      },
      "helpdesk.ticket": {
        "find": [
          "id",
          "name",
          "partner_id",
          "priority",
          "stage_id",
          "user_id",
          "create_date"
        ],
        "detail": [
          "stage_id",
          "active",
          "kanban_state",
          "name",
          "subject",
          "resolve",
          "cancel",
          "partner_id",
          "contact_name",
          "email",
          "company_id",
          "create_uid",
          "create_date",
          "id",
          "team_id",
          "user_id",
          "category_id",
          "topic_id",
          "priority",
          "date_deadline",
          "date_closed",
          "description",
          "is_lock",
          "locked_by",
          "unlocked_by",
          "lock_date",
          "unlock_date",
          "reviews",
          "attachment_ids",
          "message_follower_ids",
          "message_ids",
          "message_attachment_count",
          "display_name",
          "write_date"
        ]
      },
      "helpdesk.category": {
        "find": [
          "sequence",
          "name",
          "category_id",
          "default_team_id",
          "manager_id",
          "user_uid",
          "create_uid",
          "create_date"
        ],
        "detail": [
          "sequence",
          "name",
          "category_id",
          "create_uid",
          "create_date"
        ]
      },
      "wk.team": {
        "find": ["id", "display_name", "manager", "department_id", "create_uid"]
      }
    },
    "view_ticket": "#id={ticketNumber}&action=526&model=helpdesk.ticket&view_type=form&menu_id=362",
    "view_partner": "#id={partnerId}&action=155&model=res.partner&view_type=form&menu_id=109"
  }

}