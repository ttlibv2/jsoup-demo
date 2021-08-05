import { Node } from '../nodes/1004_Node';

export enum NodeFilterResult {
	/** Continue processing the tree */
	CONTINUE,

	/** Skip the child nodes, but do call {@link NodeFilter#tail(Node, int)} next. */
	SKIP_CHILDREN,

	/** Skip the subtree, and do not call {@link NodeFilter#tail(Node, int)}. */
	SKIP_ENTIRELY,

	/** Remove the node and its children */
	REMOVE,

	/** Stop processing */
	STOP,
}

export interface NodeFilter {
	/**
	 * Callback for when a node is first visited.
	 * @param node the node being visited.
	 * @param depth the depth of the node, relative to the root node. E.g., the root node has depth 0, and a child node of that will have depth 1.
	 * @return Filter decision
	 */
	head(node: Node, depth: number): NodeFilterResult;

	/**
	 * Callback for when a node is last visited, after all of its descendants have been visited.
	 * @param node the node being visited.
	 * @param depth the depth of the node, relative to the root node. E.g., the root node has depth 0, and a child node of that will have depth 1.
	 * @return Filter decision
	 */
	tail(node: Node, depth: number): NodeFilterResult;
}

export type NodeFilterArg = (node: Node, depth: number) => NodeFilterResult;

export class NodeFilterImpl implements NodeFilter {

	private static get cbDefault(): NodeFilterArg {
		return (node, depth) => NodeFilterResult.CONTINUE;
	}

	private headCb: NodeFilterArg = NodeFilterImpl.cbDefault;
	private tailCb: NodeFilterArg = NodeFilterImpl.cbDefault;

	set_headCb(cb: NodeFilterArg): this {
		this.headCb = cb;
		return this;
	}

	set_tailCb(cb: NodeFilterArg): this {
		this.tailCb = cb;
		return this;
	}

	/**
	 * @readonly
	 * @param node 
	 * @param depth 
	 */
	head(node: Node, depth: number): NodeFilterResult {
		return this.headCb(node, depth);
	}

	/**
	 * @readonly
	 * @param node 
	 * @param depth 
	 */
	tail(node: Node, depth: number): NodeFilterResult {
		return this.tailCb(node, depth);
	}
}
