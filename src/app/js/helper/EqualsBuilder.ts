import { Objects } from "./Objects";

/**
 * <pre>
 * public equals(o: object): boolean {
 *   return EqualsBuilder.withClass(this, o, [`*`])
 * 				.appendSuper(super.equals(obj))
 * 				.append(field1, o.field1)
 * 				.append(field2, o.field2)
 * 				.append(field3, o.field3)
 * 				.isEquals();
 *  }
 * </pre>
 */
export class EqualsBuilder {

	static withClass(lhs: any, rhs: any, fields: string[]=[]): EqualsBuilder {
		let sb = new EqualsBuilder().appendAllImpl(lhs, rhs);
		if(fields.length > 0) sb = sb.appendField(lhs, rhs, fields);
		return sb;
	}

	//-----------------------

	private equal: boolean = true;

	isEquals(): boolean {
		return this.equal;
	}

	reset(): this {
		this.equal = true;
		return this;
	}

	appendSuper(superEquals: boolean): this {
		if (!!this.equal) this.equal = superEquals;
		return this;
	}

	append(lhs: any, rhs: any, useEqual: boolean = true): this {
		let self = this.appendAllImpl(lhs, rhs);
		if (!self.equal) return this;

		// number | bigint | boolean | ...
		else if (Objects.isPrimitive(lhs) || Objects.isPrimitive(rhs)) {
			this.equal = lhs === rhs;
			return this;
		}

		// array
		else if (Array.isArray(lhs) && Array.isArray(rhs)) {
			if (lhs.length !== rhs.length) {
				this.equal = false;
				return this;
			}
			else for (let i = 0; i < lhs.length; i++) {
				this.append(lhs[i], rhs[i]);
			}
		}

		// object
		else if (Objects.isObject(lhs)) {
			if (!!useEqual && 'equals' in lhs) {
				this.equal = lhs.equals(rhs);
				return this;
			}
			else  {
				this.appendObject(lhs, rhs, useEqual);
			}
		}

		return this;
	}

	appendField(lhs: any, rhs: any, fields: string[], useEqual: boolean = true): this {
		let names = fields.length === 0 || fields.includes('*') ? Object.getOwnPropertyNames(lhs) : fields;
		for(let name of names) this.append(rhs[name], lhs[name], useEqual);
		return this;
	}

	private appendObject(lhs: object, rhs: object, useEqual: boolean = true): this {
		if (!this.equal) return this;
		else for (let prop in lhs) this.append(lhs[prop], rhs[prop], useEqual);
	}

	private appendAllImpl(lhs: any, rhs: any): this {
		if (!this.equal) return this;
		else if (lhs === rhs) return this;
		else if (lhs === null || rhs === null) this.equal = false;
		else if (lhs === undefined || rhs === undefined) this.equal = false;
		else if (lhs.constructor !== rhs.constructor) this.equal = false;
		return this;
	}

}