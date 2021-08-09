import { ClsCategory, ClsTopic, ClsUser, ClsWkTeam } from "./Model";

export interface Ticket {
  email: string;
  customer_name: string;
  body_html: string;
  subject: string;
  od_khid: number;
  od_assign: ClsUser;
  od_wkteam: ClsWkTeam;
  od_category: ClsCategory;
  od_topic: ClsTopic;
}