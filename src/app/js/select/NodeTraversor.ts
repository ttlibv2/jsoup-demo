import { Assert } from "../helper/Assert";
import { Elements } from "./Elements";
import { Node } from "../nodes/1004_Node";
import { NodeFilter, NodeFilterResult } from "./NodeFilter";
import { NodeVisitor } from "./NodeVisitor";
import { Objects } from "../helper/Objects";
import { NodeUtils } from "../nodes/NodeUtils";

/**
 * Depth-first node traversor. Use to iterate through all nodes under and including the specified root node.
 * <p>
 * This implementation does not use recursion, so a deep DOM does not risk blowing the stack.
 * </p>
 */
 export class NodeTraversor {

    /**
     * Start a depth-first traverse of the root and all of its descendants.
     * @param visitor Node visitor.
     * @param root the root node point to traverse.
     */
    static traverse(visitor: NodeVisitor, root: Node): void;

    /**
     * Start a depth-first traverse of all elements.
     * @param visitor Node visitor.
     * @param elements Elements to filter.
     */
    static traverse(visitor: NodeVisitor, elements: Elements): void;

    /**
     * @private
     */
    static traverse(visitor: NodeVisitor, node: Node | Elements): void {
        Assert.notNull(visitor);
        Assert.notNull(node);

        let traverse_node = (visitor: NodeVisitor, root: Node) => {
            Assert.notNull(visitor);
            Assert.notNull(root);

            let node: Node = root, parent: Node = null, depth = 0;

            while (Objects.notNull(node)) {
                parent = node.parent();
                visitor.head(node, depth);  // visit current node

                // must have been replaced; find replacement
                if (Objects.notNull(parent) && !node.hasParent()) {
                    node = parent.childNode(node.getSiblingIndex());
                }

                // descend
                if (node.childNodeSize() > 0) {
                    node = node.childNode(0);
                    depth++;
                }
                else {
                    while (true) {
                        Assert.notNull(node); // as depth > 0, will have parent
						if(Objects.notNull(node.nextSibling()) || depth <=0) break; 
                        //if (!(node.nextSibling() === null && depth > 0)) break;
                        visitor.tail(node, depth);
                        node = node.parent();
                        depth--;
                    }

                    visitor.tail(node, depth);
                    if (node === root) break;
                    node = node.nextSibling();
                }


            }
        };


        // root is Elements
        if (NodeUtils.isElements(node)) for(let element of <Elements>node) {
            traverse_node(visitor, element);
        }
        

        // root is node
        else if (NodeUtils.isNode(node)) {
            traverse_node(visitor, node);
        }
		
		//throw Error(`impl`);
    }

    /**
     * Start a depth-first filtering of the root and all of its descendants.
     * @param filter Node visitor.
     * @param root the root node point to traverse.
     * @return The filter result of the root node, or {@link FilterResult#STOP}.
     */
    static filter(filter: NodeFilter, root: Node): NodeFilterResult;

    /**
     * Start a depth-first filtering of all elements.
     * @param filter Node filter.
     * @param elements Elements to filter.
     */
    static filter(filter: NodeFilter, elements: Elements): void

    /**
     * @private
     */
    static filter(filter: NodeFilter, node: Node | Elements): any {
        let filter_node = (filter: NodeFilter, root: Node): NodeFilterResult => {
            let node: any = root, depth = 0;

            while (Objects.notNull(node)) {
                let result = filter.head(node, depth);
                if (result === NodeFilterResult.STOP) return result;

                // Descend into child nodes:
                if (result === NodeFilterResult.CONTINUE && node.childNodeSize() > 0) {
                    node = node.childNode(0);
                    ++depth;
                    continue;
                }

                // No siblings, move upwards:
                while (true) {
                    Assert.notNull(node); // // depth > 0, so has parent
                    if (!(node.nextSibling() === null && depth > 0)) break;

                    // 'tail' current node:
                    if (result === NodeFilterResult.CONTINUE || result === NodeFilterResult.SKIP_CHILDREN) {
                        result = filter.tail(node, depth);
                        if (result === NodeFilterResult.STOP) return result;
                    }

                    // In case we need to remove it below.
                    let prev = node;
                    node = node.parentNode;
                    depth--;

                    // Remove AFTER finding parent.
                    if (result === NodeFilterResult.REMOVE) prev.remove();

                    // Parent was not pruned.
                    result = NodeFilterResult.CONTINUE;
                }

                // 'tail' current node, then proceed with siblings:
                if (result === NodeFilterResult.CONTINUE || result === NodeFilterResult.SKIP_CHILDREN) {
                    result = filter.tail(node, depth);
                    if (result === NodeFilterResult.STOP) return result;
                }

                if (node === root) return result;

                // In case we need to remove it below.
                let prev = node;
                node = node.nextSibling();

                // Remove AFTER finding sibling.
                if (result === NodeFilterResult.REMOVE) prev.remove();
            }

            // root == null?
            return NodeFilterResult.CONTINUE;
        };

        // node is Elements
		//let isElement = node.constructor.name === `Elements`;
        if (NodeUtils.isElements(node)) {
			let nodes: Elements = <any>node;
            for (let i = 0; i < nodes.size(); i++) {
                let result = filter_node(filter, nodes.get(i));
                if (result === NodeFilterResult.STOP) break;
            }
        }

        // node is Node
        else if (NodeUtils.isNode(node)) {
            return filter_node(filter, node);
        }
    }



}
