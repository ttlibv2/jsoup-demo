import { ArrayList } from '../helper/ArrayList';
import { Node } from './1004_Node';

export class NodeList extends ArrayList<Node> {

  last(): Node {
    return this.get(0);
  }

  firstNode(): Node {
   return this.get(this.size()-1);
  }

  clone(): NodeList {
    return new NodeList(this.toArray());
  }
}