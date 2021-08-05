import { Assert } from '../helper/Assert';
import { Objects } from '../helper/Objects';
import { Attributes } from './Attributes';
import { Node } from './1004_Node';
import { NodeList } from './NodeList';

export abstract class LeafNode extends Node {
	protected value: any;

	protected getValue(): any {
		return this.value;
	}

	/** @override */
	hasAttributes(): boolean {
		return this.getValue() instanceof Attributes;
	}

	/** @override */
	attributes(): Attributes {
		this.ensureAttributes();
		return this.getValue();
	}

	private ensureAttributes() {
		if (this.hasAttributes()) return;
		else {
			let coreVal = this.getValue();
			let attrs = new Attributes();
			if (Objects.notNull(coreVal)) {
				attrs.set(this.getNodeName(), coreVal);
			}

			this.value = attrs;
		}
	}

	protected get coreVal(): string {
		return this.attr(this.getNodeName());
	}

	protected set coreVal(val: string) {
		this.attr(this.getNodeName(), val);
	}

	/** @override */
	protected get_attr(name: string): string {
		Assert.notEmpty(name);
		if(this.hasAttributes()) return super.get_attr(name);
		if(name === this.getNodeName()) return this.value;
		else return '';
	}

	/** @override */
	protected set_attr(name: string, value: string): this {
		if (!this.hasAttributes() && name === this.getNodeName()) {
			this.value = value;
		} else {
			this.ensureAttributes();
			super.set_attr(name, value);
		}
		return this;
	}

	/** @override */
	hasAttr(name: string): boolean {
		this.ensureAttributes();
		return super.hasAttr(name);
	}

	/** @override */
	removeAttr(name: string): this {
		this.ensureAttributes();
		return super.removeAttr(name);
	}

	/** @override */
	absUrl(name: string): string {
		this.ensureAttributes();
		return super.absUrl(name);
	}

	/** @override */
	getBaseUri(): string {
		return this.parent()?.getBaseUri() || '';
	}

	/** @override */
	protected doSetBaseUri(baseUri: string) {}

	/** @override */
	childNodeSize(): number {
		return 0;
	}

	/** @override */
	empty(): this {
		return this;
	}

	/** @override */
	childNodes(): NodeList {
		return new NodeList();
	}

	/** @override */
	protected doClone(parent: Node): LeafNode {
		let clone: LeafNode = <any>super.doClone(parent);
		if (this.hasAttributes()) clone.value = this.value.clone();
		return clone;
	}
}
