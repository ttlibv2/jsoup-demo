import { ArrayList } from "../js/helper/ArrayList";
import { HashMap } from "../js/helper/HashMap";

export abstract class ClsModel {
  customObj: HashMap<string, any> = new HashMap();

  set(key: string, value: any): this {
    this.customObj.set(key, value);
    return this;
  }

}

export class ClsNameSearchOption extends ClsModel {
  limit: number;
  url: string;
  args: any;
}

export class ClsNote extends ClsModel {
  partner_ids: ArrayList<any> = new ArrayList();
  attachment_ids: ArrayList<any> =  new ArrayList();
  canned_response_ids: ArrayList<any> =  new ArrayList();

  id: number;
  body: string;
  message_type: string = 'comment';
  subtype: string = 'mail.mt_note';
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

