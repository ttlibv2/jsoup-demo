import { Node } from '../nodes/Node';
import { Objects } from './Objects';

export class Assert {
	
	static fail(msg: string) {
		throw new Error(msg);
	}

	static noNullElements(children: Node[]) {
		throw new Error('Method not implemented.');
	}

	static isTrue(bool: boolean, msg?: string) {
		if (!!bool) return bool;
		else throw new Error(msg || `must be true`);
	}

	static isFalse(bool: boolean, msg?: string): boolean {
		if (!bool === true) return bool;
		else throw new Error(msg || `must be false`);
	}

	static notNull<T>(object: T, msg?: string): T {
		if (Objects.notNull(object)) return object;
		else throw new Error(msg || 'must be not null');
	}

	static allNotNull<T>(object: T[], msg?: string): T[] {
		if (Objects.allNotNull(object)) return object;
		else throw new Error(msg || 'must be not null');
	}

	static notEmpty(str: string, msg?: string): string {
		if (Objects.notEmpty(str)) return str;
		else throw new Error(msg || `must be not empty.`);
	}
}
