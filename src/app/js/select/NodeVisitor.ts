import { Node } from "../nodes/Node";

/**
 * Node visitor interface. Provide an implementing class to {@link NodeTraversor} to iterate through nodes.
 * <p>
 * This interface provides two methods, {@code head} and {@code tail}. The head method is called when the node is first
 * seen, and the tail method when all of the node's children have been visited. As an example, {@code head} can be used to
 * emit a start tag for a node, and {@code tail} to create the end tag.
 * </p>
 */
export interface NodeVisitor {
  /**
   * Callback for when a node is first visited.
   * <p>The node may be modified
   * <p>Note that nodes may not be removed during traversal using this method;
   * @param node the node being visited.
   * @param depth the depth of the node, relative to the root node. E.g., the root node has depth 0, and a child node of that will have depth 1.
   */
  head(node: Node, depth: number): void;

  /**
   * Callback for when a node is last visited, after all of its descendants have been visited.
   * <p>Note that replacement with {@link Node#replaceWith(Node)}</p> is not supported in {@code tail}.
   * @param node the node being visited.
   * @param depth the depth of the node, relative to the root node. E.g., the root node has depth 0, and a child node of that will have depth 1.
   */
  tail(node: Node, depth: number): void;
}

export type NodeVisitorArg = (node: Node, depth: number) => void;

export class NodeVisitorImpl implements NodeVisitor {
  private cbHeadNode: NodeVisitorArg = (node, depth) => {};
  private cbTailNode: NodeVisitorArg = (node, depth) => {};

  withHead(callback: NodeVisitorArg): this {
    this.cbHeadNode = callback;
    return this;
  }

  withTail(callback: NodeVisitorArg): this {
    this.cbHeadNode = callback;
    return this;
  }

  head(node: Node, depth: number): void {
    this.cbHeadNode(node, depth);
  }

  tail(node: Node, depth: number): void {
    this.cbTailNode(node, depth);
  }
}
