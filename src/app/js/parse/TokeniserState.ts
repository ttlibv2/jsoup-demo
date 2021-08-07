/*eslint-disable*/
import { Char } from "../helper/Char";
import { CharacterReader } from "./CharacterReader";
import { Tokeniser } from "./Tokeniser";
import * as NSToken from "./Token";
import { Objects } from "../helper/Objects";
import { DocumentType } from "../nodes/DocumentType";

export abstract class TokeniserState  {
	static readonly nullChar: Char = Char.Default;
	static readonly attributeNameCharsSorted: Char[] = Char.of(['\t', '\n', '\f', '\r', ' ', '"', "'", '/', '<', '=', '>']);
	static readonly attributeValueUnquoted: Char[] = Char.of(['\u0000', '\t', '\n', '\f', '\r', ' ', '"', '&', "'", '<', '=', '>', '`']);
	static get replacementChar(): Char { return Tokeniser.replacementChar; }
	//static readonly replacementStr: string = Tokeniser.replacementChar.string;
	static readonly eof: string = CharacterReader.EOF.string;

	/**
	 * Handles RawtextEndTagName, ScriptDataEndTagName, and ScriptDataEscapedEndTagName. Same body impl, just
	 * different else exit transitions.
	 */
	static handleDataEndTag(t: Tokeniser, r: CharacterReader, elseTransition: TokeniserState): void {
		// matchesLetter
		if (r.matchesLetter()) {
			let name = r.consumeLetterSequence();
			t.tagPending.appendTagName(name);
			t.dataBuffer.append(name);
		} //
		else {
			let needsExitTransition = !(t.isAppropriateEndTagToken() && !r.isEmpty());
			if (!needsExitTransition) {
				let c = r.consume();
let str = c.string;
				switch (c.string) {
					case '\t':
					case '\n':
					case '\r':
					case '\f':
					case ' ':
						t.transition(BeforeAttributeName.instance);
						break;
					case '/':
						t.transition(SelfClosingStartTag.instance);
						break;
					case '>':
						t.emitTagPending();
						t.transition(Data.instance);
						break;
					default:
						t.dataBuffer.append(c);
						needsExitTransition = true;
				}
			}

			//
			if (needsExitTransition) {
				t.emit('</');
				t.emit(t.dataBuffer);
				t.transition(elseTransition);
			}
		}
	}

	static readRawData(t: Tokeniser, r: CharacterReader, current: TokeniserState, advance: TokeniserState): void {
		switch (r.current().string) {
			case '<':
				t.advanceTransition(advance);
				break;
			case TokeniserState.nullChar.string:
				t.error(current);
				r.advance();
				t.emit(TokeniserState.replacementChar);
				break;
			case TokeniserState.eof:
				t.emit(new NSToken.EOF());
				break;
			default:
				let data = r.consumeRawData();
				t.emit(data);
				break;
		}
	}

	static readCharRef(t: Tokeniser, advance: TokeniserState): void {
		let c = t.consumeCharacterReference(null, false);
		if (Objects.isNull(c)) t.emit('&');
		else t.emit(c);
		t.transition(advance);
	}

	static readEndTag(t: Tokeniser, r: CharacterReader, a: TokeniserState, b: TokeniserState): void {
		if (r.matchesLetter()) {
			t.createTagPending(false);
			t.transition(a);
		} else {
			t.emit('</');
			t.transition(b);
		}
	}

	static handleDataDoubleEscapeTag(t: Tokeniser, r: CharacterReader, primary: TokeniserState, fallback: TokeniserState): void {
		if (r.matchesLetter()) {
			let name = r.consumeLetterSequence();
			t.dataBuffer.append(name);
			t.emit(name);
			return;
		}

		//
		let c = r.consume();
let str = c.string;
		switch (c.string) {
			case '\t':
			case '\n':
			case '\r':
			case '\f':
			case ' ':
			case '/':
			case '>':
				if (t.dataBuffer.toString() === 'script') t.transition(primary);
				else t.transition(fallback);
				t.emit(c);
				break;
			default:
				r.unconsume();
				t.transition(fallback);
		}
	}

	static anythingElse(t: Tokeniser, r: CharacterReader) {
		t.emit('</');
		t.emit(t.dataBuffer);
		r.unconsume();
		t.transition(Rcdata.instance);
	}

	abstract read(t: Tokeniser, r: CharacterReader): void;

}

class Data extends TokeniserState {
	static instance = new Data();
	read(t: Tokeniser, r: CharacterReader): void {
		switch (r.current().string) {
			case '&':
				t.advanceTransition(CharacterReferenceInData.instance);
				break;
			case '<':
				t.advanceTransition(TagOpen.instance);
				break;
			case TokeniserState.nullChar.string:
				t.error(this); // NOT replacement character (oddly?)
				t.emit(r.consume());
				break;
			case TokeniserState.eof:
				t.emit(new NSToken.EOF());
				break;
			default:
				let data = r.consumeData();
				t.emit(data);
				break;
		}	}
}

class CharacterReferenceInData extends TokeniserState {
	static instance = new CharacterReferenceInData();
	read(t: Tokeniser, r: CharacterReader): void {
		TokeniserState.readCharRef(t, Data.instance);
	}
}

class Rcdata extends TokeniserState {
	static instance = new Rcdata();
	read(t: Tokeniser, r: CharacterReader): void {
		switch (r.current().string) {
			case '&':
				t.advanceTransition(CharacterReferenceInRcdata.instance);
				break;
			case '<':
				t.advanceTransition(RcdataLessthanSign.instance);
				break;
			case TokeniserState.nullChar.string:
				t.error(this);
				r.advance();
				t.emit(TokeniserState.replacementChar);
				break;
			case TokeniserState.eof:
				t.emit(new NSToken.EOF());
				break;
			default:
				let data = r.consumeData();
				t.emit(data);
				break;
		}	}
}

class CharacterReferenceInRcdata extends TokeniserState {
	static instance = new CharacterReferenceInRcdata();
	read(t: Tokeniser, r: CharacterReader): void {
		TokeniserState.readCharRef(t, Rcdata.instance);
	}
}

class Rawtext extends TokeniserState {
	static instance = new Rawtext();
	read(t: Tokeniser, r: CharacterReader): void {
		TokeniserState.readRawData(t, r, this, RawtextLessthanSign.instance);
	}
}

class ScriptData extends TokeniserState {
	static instance = new ScriptData();
	read(t: Tokeniser, r: CharacterReader): void {
		TokeniserState.readRawData(t, r, this, ScriptDataLessthanSign.instance);

	}
}

class PLAINTEXT extends TokeniserState {
	static instance = new PLAINTEXT();
	read(t: Tokeniser, r: CharacterReader): void {
		switch (r.current().string) {
			case TokeniserState.nullChar.string:
				t.error(this);
				r.advance();
				t.emit(TokeniserState.replacementChar);
				break;
			case TokeniserState.eof:
				t.emit(new NSToken.EOF());
				break;
			default:
				let data = r.consumeTo(PLAINTEXT.nullChar);
				t.emit(data);
				break;
		}
	}
}

class TagOpen extends TokeniserState {
	static instance = new TagOpen();
	read(t: Tokeniser, r: CharacterReader): void {
		switch (r.current().string) {
			case '!':
				t.advanceTransition(MarkupDeclarationOpen.instance);
				break;
			case '/':
				t.advanceTransition(EndTagOpen.instance);
				break;
			case '?':
				t.createBogusCommentPending();
				t.advanceTransition(BogusComment.instance);
				break;
			default:
				if (r.matchesLetter()) {
					t.createTagPending(true);
					t.transition(TagName.instance);
				} else {
					t.error(this);
					t.emit('<'); // char that got us here
					t.transition(Data.instance);
				}
				break;
		}
	}
}

class EndTagOpen extends TokeniserState {
	static instance = new EndTagOpen();
	read(t: Tokeniser, r: CharacterReader): void {
		if (r.isEmpty()) {
			t.eofError(this);
			t.emit('</');
			t.transition(Data.instance);
		} else if (r.matchesLetter()) {
			t.createTagPending(false);
			t.transition(TagName.instance);
		} else if (r.matches('>')) {
			t.error(this);
			t.advanceTransition(Data.instance);
		} else {
			t.error(this);
			t.createBogusCommentPending();
			t.advanceTransition(BogusComment.instance);
		}
	}
}

class TagName extends TokeniserState {
	static instance = new TagName();
	read(t: Tokeniser, r: CharacterReader): void {
		let tagName = r.consumeTagName();
		t.tagPending.appendTagName(tagName);

		let c: Char = r.consume();
		let str = c.string;
		switch (str) {
			case '\t':
			case '\n':
			case '\r':
			case '\f':
			case ' ':
				t.transition(BeforeAttributeName.instance);
				break;
			case '/':
				t.transition(SelfClosingStartTag.instance);
				break;
			case '<': // NOTE: out of spec, but clear author intent
				r.unconsume();
				t.error(this);
			// intended fall through to next >
			case '>':
				t.emitTagPending();
				t.transition(Data.instance);
				break;
			case TokeniserState.nullChar.string: // replacement
				t.tagPending.appendTagName(TokeniserState.replacementChar);
				break;
			case TokeniserState.eof: // should emit pending tag?
				t.eofError(this);
				t.transition(Data.instance);
				break;
			default:
				// buffer underrun
				t.tagPending.appendTagName(c);
		}
	}
}

class RcdataLessthanSign extends TokeniserState {
	static instance = new RcdataLessthanSign();
	read(t: Tokeniser, r: CharacterReader): void {
		if (r.matches('/')) {
			t.createTempBuffer();
			t.advanceTransition(RCDATAEndTagOpen.instance);
		}

		//
		else if (r.matchesLetter() && Objects.notNull(t.appropriateEndTagName()) && !r.containsIgnoreCase('</' + t.appropriateEndTagName())) {
			// diverge from spec: got a start tag, but there's no appropriate end tag (</title>), so rather than
			// consuming to EOF; break out here
			t.tagPending = t.createTagPending(false).set_tagName(t.appropriateEndTagName());
			t.emitTagPending();
			t.transition(TagOpen.instance); // straight into TagOpen, as we came from < and looks like we're on a start tag
		} else {
			t.emit('<');
			t.transition(Rcdata.instance);
		}
	}
}
class RCDATAEndTagOpen extends TokeniserState {
	static instance = new RCDATAEndTagOpen();
	read(t: Tokeniser, r: CharacterReader): void {
		if (r.matchesLetter()) {
			t.createTagPending(false);
			t.tagPending.appendTagName(r.current());
			t.dataBuffer.append(r.current());
			t.advanceTransition(RCDATAEndTagName.instance);
		} else {
			t.emit('</');
			t.transition(Rcdata.instance);
		}
	}
}

class RCDATAEndTagName extends TokeniserState {
	static instance = new RCDATAEndTagName();
	read(t: Tokeniser, r: CharacterReader): void {
		if (r.matchesLetter()) {
			let name = r.consumeLetterSequence();
			t.tagPending.appendTagName(name);
			t.dataBuffer.append(name);
			return;
		}

		let c = r.consume();
let str = c.string;
		switch (c.string) {
			case '\t':
			case '\n':
			case '\r':
			case '\f':
			case ' ':
				if (t.isAppropriateEndTagToken()) t.transition(BeforeAttributeName.instance);
				else TokeniserState.anythingElse(t, r);
				break;
			case '/':
				if (t.isAppropriateEndTagToken()) t.transition(SelfClosingStartTag.instance);
				else TokeniserState.anythingElse(t, r);
				break;
			case '>':
				if (t.isAppropriateEndTagToken()) {
					t.emitTagPending();
					t.transition(Data.instance);
				} else TokeniserState.anythingElse(t, r);
				break;
			default:
				TokeniserState.anythingElse(t, r);
		}
	}
}

class RawtextLessthanSign extends TokeniserState {
	static instance = new RawtextLessthanSign();
	read(t: Tokeniser, r: CharacterReader): void {
		if (r.matches('/')) {
			t.createTempBuffer();
			t.advanceTransition(RawtextEndTagOpen.instance);
		} else {
			t.emit('<');
			t.transition(Rawtext.instance);
		}
	}
}

class RawtextEndTagOpen extends TokeniserState {
	static instance = new RawtextEndTagOpen();
	read(t: Tokeniser, r: CharacterReader): void {
		TokeniserState.readEndTag(t, r, RawtextEndTagName.instance, Rawtext.instance);
	}
}
class RawtextEndTagName extends TokeniserState {
	static instance = new RawtextEndTagName();
	read(t: Tokeniser, r: CharacterReader): void {
		TokeniserState.handleDataEndTag(t, r, Rawtext.instance);
	}
}

class ScriptDataLessthanSign extends TokeniserState {
	static instance = new ScriptDataLessthanSign();
	read(t: Tokeniser, r: CharacterReader): void {
		switch (r.consume().string) {
			case '/':
				t.createTempBuffer();
				t.transition(ScriptDataEndTagOpen.instance);
				break;
			case '!':
				t.emit('<!');
				t.transition(ScriptDataEscapeStart.instance);
				break;
			case TokeniserState.eof:
				t.emit('<');
				t.eofError(this);
				t.transition(Data.instance);
				break;
			default:
				t.emit('<');
				r.unconsume();
				t.transition(ScriptData.instance);
		}	}
}

class ScriptDataEndTagOpen extends TokeniserState {
	static instance = new ScriptDataEndTagOpen();
	read(t: Tokeniser, r: CharacterReader): void {
		TokeniserState.readEndTag(t, r, ScriptDataEndTagName.instance, ScriptData.instance);

	}
}

class ScriptDataEndTagName extends TokeniserState {
	static instance = new ScriptDataEndTagName();
	read(t: Tokeniser, r: CharacterReader): void {
		TokeniserState.handleDataEndTag(t, r, ScriptData.instance);

	}
}
class ScriptDataEscapeStart extends TokeniserState {
	static instance = new ScriptDataEscapeStart();
	read(t: Tokeniser, r: CharacterReader): void {
		if (r.matches('-')) {
			t.emit('-');
			t.advanceTransition(ScriptDataEscapeStartDash.instance);
		} else {
			t.transition(ScriptData.instance);
		}

	}
}

class ScriptDataEscapeStartDash extends TokeniserState {
	static instance = new ScriptDataEscapeStartDash();
	read(t: Tokeniser, r: CharacterReader): void {
		if (r.matches('-')) {
			t.emit('-');
			t.advanceTransition(ScriptDataEscapedDashDash.instance);
		} else {
			t.transition(ScriptData.instance);
		}
	}
}

class ScriptDataEscaped extends TokeniserState {
	static instance = new ScriptDataEscaped();
	read(t: Tokeniser, r: CharacterReader): void {
		if (r.isEmpty()) {
			t.eofError(this);
			t.transition(Data.instance);
			return;
		}

		switch (r.current().string) {
			case '-':
				t.emit('-');
				t.advanceTransition(ScriptDataEscapedDash.instance);
				break;
			case '<':
				t.advanceTransition(ScriptDataEscapedLessthanSign.instance);
				break;
			case TokeniserState.nullChar.string:
				t.error(this);
				r.advance();
				t.emit(ScriptDataEscaped.replacementChar);
				break;
			default:
				let data = r.consumeToAny(['-', '<', ScriptDataEscaped.nullChar.string]);
				t.emit(data);
		}
	}
}

class ScriptDataEscapedDash extends TokeniserState {
	static instance = new ScriptDataEscapedDash();
	read(t: Tokeniser, r: CharacterReader): void {
		if (r.isEmpty()) {
			t.eofError(this);
			t.transition(Data.instance);
			return;
		}

		let c = r.consume();
let str = c.string;
		switch (c.string) {
			case '-':
				t.emit(c);
				t.transition(ScriptDataEscapedDashDash.instance);
				break;
			case '<':
				t.transition(ScriptDataEscapedLessthanSign.instance);
				break;
			case TokeniserState.nullChar.string:
				t.error(this);
				t.emit(ScriptDataEscapedDash.replacementChar);
				t.transition(ScriptDataEscaped.instance);
				break;
			default:
				t.emit(c);
				t.transition(ScriptDataEscaped.instance);
		}
	}
}
class ScriptDataEscapedDashDash extends TokeniserState {
	static instance = new ScriptDataEscapedDashDash();
	read(t: Tokeniser, r: CharacterReader): void {
		if (r.isEmpty()) {
			t.eofError(this);
			t.transition(Data.instance);
			return;
		}

		let c = r.consume();
let str = c.string;
		switch (c.string) {
			case '-':
				t.emit(c);
				break;
			case '<':
				t.transition(ScriptDataEscapedLessthanSign.instance);
				break;
			case '>':
				t.emit(c);
				t.transition(ScriptData.instance);
				break;
			case TokeniserState.nullChar.string:
				t.error(this);
				t.emit(ScriptDataEscapedDashDash.replacementChar);
				t.transition(ScriptDataEscaped.instance);
				break;
			default:
				t.emit(c);
				t.transition(ScriptDataEscaped.instance);
		}
	}
}

class ScriptDataEscapedLessthanSign extends TokeniserState {
	static instance = new ScriptDataEscapedLessthanSign();
	read(t: Tokeniser, r: CharacterReader): void {
		if (r.matchesLetter()) {
			t.createTempBuffer();
			t.dataBuffer.append(r.current());
			t.emit('<');
			t.emit(r.current());
			t.advanceTransition(ScriptDataDoubleEscapeStart.instance);
		} else if (r.matches('/')) {
			t.createTempBuffer();
			t.advanceTransition(ScriptDataEscapedEndTagOpen.instance);
		} else {
			t.emit('<');
			t.transition(ScriptDataEscaped.instance);
		}
	}
}

class ScriptDataEscapedEndTagOpen extends TokeniserState {
	static instance = new ScriptDataEscapedEndTagOpen();
	read(t: Tokeniser, r: CharacterReader): void {
		if (r.matchesLetter()) {
			t.createTagPending(false);
			t.tagPending.appendTagName(r.current());
			t.dataBuffer.append(r.current());
			t.advanceTransition(ScriptDataEscapedEndTagName.instance);
		} else {
			t.emit('</');
			t.transition(ScriptDataEscaped.instance);
		}
	}
}

class ScriptDataEscapedEndTagName extends TokeniserState {
	static instance = new ScriptDataEscapedEndTagName();
	read(t: Tokeniser, r: CharacterReader): void {
		TokeniserState.handleDataEndTag(t, r, ScriptDataEscaped.instance);

	}
}
class ScriptDataDoubleEscapeStart extends TokeniserState {
	static instance = new ScriptDataDoubleEscapeStart();
	read(t: Tokeniser, r: CharacterReader): void {
		TokeniserState.handleDataDoubleEscapeTag(t, r, ScriptDataDoubleEscaped.instance, ScriptDataEscaped.instance);

	}
}

class ScriptDataDoubleEscaped extends TokeniserState {
	static instance = new ScriptDataDoubleEscaped();
	read(t: Tokeniser, r: CharacterReader): void {
		let c = r.current();
		switch (c.string) {
			case '-':
				t.emit(c);
				t.advanceTransition(ScriptDataDoubleEscapedDash.instance);
				break;
			case '<':
				t.emit(c);
				t.advanceTransition(ScriptDataDoubleEscapedLessthanSign.instance);
				break;
			case TokeniserState.nullChar.string:
				t.error(this);
				r.advance();
				t.emit(ScriptDataDoubleEscaped.replacementChar);
				break;
			case TokeniserState.eof:
				t.eofError(this);
				t.transition(Data.instance);
				break;
			default:
				let data = r.consumeToAny(['-', '<', TokeniserState.nullChar.string]);
				t.emit(data);
		}
	}
}

class ScriptDataDoubleEscapedDash extends TokeniserState {
	static instance = new ScriptDataDoubleEscapedDash();
	read(t: Tokeniser, r: CharacterReader): void {
		let c = r.consume();
let str = c.string;
		switch (c.string) {
			case '-':
				t.emit(c);
				t.transition(ScriptDataDoubleEscapedDashDash.instance);
				break;
			case '<':
				t.emit(c);
				t.transition(ScriptDataDoubleEscapedLessthanSign.instance);
				break;
			case TokeniserState.nullChar.string:
				t.error(this);
				t.emit(ScriptDataDoubleEscapedDash.replacementChar);
				t.transition(ScriptDataDoubleEscaped.instance);
				break;
			case TokeniserState.eof:
				t.eofError(this);
				t.transition(Data.instance);
				break;
			default:
				t.emit(c);
				t.transition(ScriptDataDoubleEscaped.instance);
		}
	}
}

class ScriptDataDoubleEscapedDashDash extends TokeniserState {
	static instance = new ScriptDataDoubleEscapedDashDash();
	read(t: Tokeniser, r: CharacterReader): void {
		let c = r.consume();
let str = c.string;
		switch (c.string) {
			case '-':
				t.emit(c);
				break;
			case '<':
				t.emit(c);
				t.transition(ScriptDataDoubleEscapedLessthanSign.instance);
				break;
			case '>':
				t.emit(c);
				t.transition(ScriptData.instance);
				break;
			case TokeniserState.nullChar.string:
				t.error(this);
				t.emit(ScriptDataDoubleEscapedDashDash.replacementChar);
				t.transition(ScriptDataDoubleEscaped.instance);
				break;
			case TokeniserState.eof:
				t.eofError(this);
				t.transition(Data.instance);
				break;
			default:
				t.emit(c);
				t.transition(ScriptDataDoubleEscaped.instance);
		}
	}
}
class ScriptDataDoubleEscapedLessthanSign extends TokeniserState {
	static instance = new ScriptDataDoubleEscapedLessthanSign();
	read(t: Tokeniser, r: CharacterReader): void {
		if (r.matches('/')) {
			t.emit('/');
			t.createTempBuffer();
			t.advanceTransition(ScriptDataDoubleEscapeEnd.instance);
		} else {
			t.transition(ScriptDataDoubleEscaped.instance);
		}
	}
}

class ScriptDataDoubleEscapeEnd extends TokeniserState {
	static instance = new ScriptDataDoubleEscapeEnd();
	read(t: Tokeniser, r: CharacterReader): void {
		TokeniserState.handleDataDoubleEscapeTag(t, r, ScriptDataEscaped.instance, ScriptDataDoubleEscaped.instance);
	}
}

class BeforeAttributeName extends TokeniserState {
	static instance = new BeforeAttributeName();
	read(t: Tokeniser, r: CharacterReader): void {
		let c = r.consume();
let str = c.string;
		switch (c.string) {
			case '\t':
			case '\n':
			case '\r':
			case '\f':
			case ' ':
				break; // ignore whitespace
			case '/':
				t.transition(SelfClosingStartTag.instance);
				break;
			case '<': // NOTE: out of spec, but clear (spec has this as a part of the attribute name)
				r.unconsume();
				t.error(this);
			// intended fall through as if >
			case '>':
				t.emitTagPending();
				t.transition(Data.instance);
				break;
			case TokeniserState.nullChar.string:
				r.unconsume();
				t.error(this);
				t.tagPending.newAttribute();
				t.transition(AttributeName.instance);
				break;
			case TokeniserState.eof:
				t.eofError(this);
				t.transition(Data.instance);
				break;
			case '"':
			case "'":
			case '=':
				t.error(this);
				t.tagPending.newAttribute();
				t.tagPending.appendAttributeName(c);
				t.transition(AttributeName.instance);
				break;
			default:
				// A-Z, anything else
				t.tagPending.newAttribute();
				r.unconsume();
				t.transition(AttributeName.instance);
		}
	}
}

class AttributeName extends TokeniserState {
	static instance = new AttributeName();
	read(t: Tokeniser, r: CharacterReader): void {
		let name = r.consumeToAnySorted(AttributeName.attributeNameCharsSorted); // spec deviate - consume and emit nulls in one hit vs stepping
		t.tagPending.appendAttributeName(name);

		let c = r.consume();
let str = c.string;
		switch (c.string) {
			case '\t':
			case '\n':
			case '\r':
			case '\f':
			case ' ':
				t.transition(AfterAttributeName.instance);
				break;
			case '/':
				t.transition(SelfClosingStartTag.instance);
				break;
			case '=':
				t.transition(BeforeAttributeValue.instance);
				break;
			case '>':
				t.emitTagPending();
				t.transition(Data.instance);
				break;
			case TokeniserState.eof:
				t.eofError(this);
				t.transition(Data.instance);
				break;
			case '"':
			case "'":
			case '<':
				t.error(this);
				t.tagPending.appendAttributeName(c);
				break;
			default:
				// buffer underrun
				t.tagPending.appendAttributeName(c);
		}
	}
}
class AfterAttributeName extends TokeniserState {
	static instance = new AfterAttributeName();
	read(t: Tokeniser, r: CharacterReader): void {
		let c = r.consume();
let str = c.string;
		switch (c.string) {
			case '\t':
			case '\n':
			case '\r':
			case '\f':
			case ' ':
				// ignore
				break;
			case '/':
				t.transition(SelfClosingStartTag.instance);
				break;
			case '=':
				t.transition(BeforeAttributeValue.instance);
				break;
			case '>':
				t.emitTagPending();
				t.transition(Data.instance);
				break;
			case TokeniserState.nullChar.string:
				t.error(this);
				t.tagPending.appendAttributeName(AfterAttributeName.replacementChar);
				t.transition(AttributeName.instance);
				break;
			case TokeniserState.eof:
				t.eofError(this);
				t.transition(Data.instance);
				break;
			case '"':
			case "'":
			case '<':
				t.error(this);
				t.tagPending.newAttribute();
				t.tagPending.appendAttributeName(c);
				t.transition(AttributeName.instance);
				break;
			default:
				// A-Z, anything else
				t.tagPending.newAttribute();
				r.unconsume();
				t.transition(AttributeName.instance);
		}
	}
}

class BeforeAttributeValue extends TokeniserState {
	static instance = new BeforeAttributeValue();
	read(t: Tokeniser, r: CharacterReader): void {
		let c = r.consume();
let str = c.string;
		switch (c.string) {
			case '\t':
			case '\n':
			case '\r':
			case '\f':
			case ' ':
				// ignore
				break;
			case '"':
				t.transition(AttributeValue_doubleQuoted.instance);
				break;
			case '&':
				r.unconsume();
				t.transition(AttributeValue_unquoted.instance);
				break;
			case "'":
				t.transition(AttributeValue_singleQuoted.instance);
				break;
			case TokeniserState.nullChar.string:
				t.error(this);
				t.tagPending.appendAttributeValue(BeforeAttributeValue.replacementChar);
				t.transition(AttributeValue_unquoted.instance);
				break;
			case TokeniserState.eof:
				t.eofError(this);
				t.emitTagPending();
				t.transition(Data.instance);
				break;
			case '>':
				t.error(this);
				t.emitTagPending();
				t.transition(Data.instance);
				break;
			case '<':
			case '=':
			case '`':
				t.error(this);
				t.tagPending.appendAttributeValue(c);
				t.transition(AttributeValue_unquoted.instance);
				break;
			default:
				r.unconsume();
				t.transition(AttributeValue_unquoted.instance);
		}
	}
}

class AttributeValue_doubleQuoted extends TokeniserState {
	static instance = new AttributeValue_doubleQuoted();
	read(t: Tokeniser, r: CharacterReader): void {
		let value = r.consumeAttributeQuoted(false);
		if (value.length > 0) t.tagPending.appendAttributeValue(value);
		else t.tagPending.setEmptyAttributeValue();

		let c = r.consume();
let str = c.string;
		switch (c.string) {
			case '"':
				t.transition(AfterAttributeValue_quoted.instance);
				break;
			case '&':
				let ref = t.consumeCharacterReference(Char.of(`"`), true);
				if (ref != null) t.tagPending.appendAttributeValue(ref);
				else t.tagPending.appendAttributeValue('&');
				break;
			case TokeniserState.nullChar.string:
				t.error(this);
				t.tagPending.appendAttributeValue(AttributeValue_doubleQuoted.replacementChar);
				break;
			case TokeniserState.eof:
				t.eofError(this);
				t.transition(Data.instance);
				break;
			default:
				// hit end of buffer in first read, still in attribute
				t.tagPending.appendAttributeValue(c);
		}
	}
}

class AttributeValue_singleQuoted extends TokeniserState {
	static instance = new AttributeValue_singleQuoted();
	read(t: Tokeniser, r: CharacterReader): void {
		let value = r.consumeAttributeQuoted(true);
		if (value.length > 0) t.tagPending.appendAttributeValue(value);
		else t.tagPending.setEmptyAttributeValue();

		let c = r.consume();
let str = c.string;
		switch (c.string) {
			case "'":
				t.transition(AfterAttributeValue_quoted.instance);
				break;
			case '&':
				let ref = t.consumeCharacterReference(Char.of(`'`), true);
				if (ref != null) t.tagPending.appendAttributeValue(ref);
				else t.tagPending.appendAttributeValue('&');
				break;
			case TokeniserState.nullChar.string:
				t.error(this);
				t.tagPending.appendAttributeValue(AttributeValue_singleQuoted.replacementChar);
				break;
			case TokeniserState.eof:
				t.eofError(this);
				t.transition(Data.instance);
				break;
			default:
				// hit end of buffer in first read, still in attribute
				t.tagPending.appendAttributeValue(c);
		}
	}
}
class AttributeValue_unquoted extends TokeniserState {
	static instance = new AttributeValue_unquoted();
	read(t: Tokeniser, r: CharacterReader): void {
		let value = r.consumeToAnySorted(AttributeValue_unquoted.attributeValueUnquoted);
		if (value.length > 0) t.tagPending.appendAttributeValue(value);

		let c = r.consume();
let str = c.string;
		switch (c.string) {
			case '\t':
			case '\n':
			case '\r':
			case '\f':
			case ' ':
				t.transition(BeforeAttributeName.instance);
				break;
			case '&':
				let ref = t.consumeCharacterReference('>', true);
				if (ref != null) t.tagPending.appendAttributeValue(ref);
				else t.tagPending.appendAttributeValue('&');
				break;
			case '>':
				t.emitTagPending();
				t.transition(Data.instance);
				break;
			case TokeniserState.nullChar.string:
				t.error(this);
				t.tagPending.appendAttributeValue(AttributeValue_unquoted.replacementChar);
				break;
			case TokeniserState.eof:
				t.eofError(this);
				t.transition(Data.instance);
				break;
			case '"':
			case "'":
			case '<':
			case '=':
			case '`':
				t.error(this);
				t.tagPending.appendAttributeValue(c);
				break;
			default:
				// hit end of buffer in first read, still in attribute
				t.tagPending.appendAttributeValue(c);
		}
	}
}

class AfterAttributeValue_quoted extends TokeniserState {
	static instance = new AfterAttributeValue_quoted();
	read(t: Tokeniser, r: CharacterReader): void {
		let c = r.consume();
let str = c.string;
		switch (c.string) {
			case '\t':
			case '\n':
			case '\r':
			case '\f':
			case ' ':
				t.transition(BeforeAttributeName.instance);
				break;
			case '/':
				t.transition(SelfClosingStartTag.instance);
				break;
			case '>':
				t.emitTagPending();
				t.transition(Data.instance);
				break;
			case TokeniserState.eof:
				t.eofError(this);
				t.transition(Data.instance);
				break;
			default:
				r.unconsume();
				t.error(this);
				t.transition(BeforeAttributeName.instance);
		}
	}
}

class SelfClosingStartTag extends TokeniserState {
	static instance = new SelfClosingStartTag();
	read(t: Tokeniser, r: CharacterReader): void {
		let c = r.consume();
	let str = c.string;
		switch (c.string) {
			case '>':
				t.tagPending.setSelfClosing();
				t.emitTagPending();
				t.transition(Data.instance);
				break;
			case TokeniserState.eof:
				t.eofError(this);
				t.transition(Data.instance);
				break;
			default:
				r.unconsume();
				t.error(this);
				t.transition(BeforeAttributeName.instance);
		}
	}
}

class BogusComment extends TokeniserState {
	static instance = new BogusComment();
	read(t: Tokeniser, r: CharacterReader): void {
		// todo: handle bogus comment starting from eof. when does that trigger?
		// rewind to capture character that lead us here
		r.unconsume();
		t.commentPending.append(r.consumeTo('>'));
		// todo: replace nullChar with replaceChar
		let next = r.consume().string;
		if (next === '>' || next === TokeniserState.eof) {
			t.emitCommentPending();
			t.transition(Data.instance);
		}
	}
}
class MarkupDeclarationOpen extends TokeniserState {
	static instance = new MarkupDeclarationOpen();
	read(t: Tokeniser, r: CharacterReader): void {
		if (r.matchConsume('--')) {
			t.createCommentPending();
			t.transition(CommentStart.instance);
		} else if (r.matchConsumeIgnoreCase('DOCTYPE')) {
			t.transition(Doctype.instance);
		} else if (r.matchConsume('[CDATA[')) {
			// todo: should actually check current namepspace, and only non-html allows cdata. until namespace
			// is implemented properly, keep handling as cdata
			//} else if (!t.currentNodeInHtmlNS() && r.matchConsume("[CDATA[")) {
			t.createTempBuffer();
			t.transition(CdataSection.instance);
		} else {
			t.error(this);
			t.createBogusCommentPending();
			t.advanceTransition(BogusComment.instance); // advance so this character gets in bogus comment data's rewind
		}
	}
}

class CommentStart extends TokeniserState {
	static instance = new CommentStart();
	read(t: Tokeniser, r: CharacterReader): void {
		let c = r.consume();
	let str = c.string;
		switch (c.string) {
			case '-':
				t.transition(CommentStartDash.instance);
				break;
			case TokeniserState.nullChar.string:
				t.error(this);
				t.commentPending.append(CommentStart.replacementChar);
				t.transition(Comment.instance);
				break;
			case '>':
				t.error(this);
				t.emitCommentPending();
				t.transition(Data.instance);
				break;
			case TokeniserState.eof:
				t.eofError(this);
				t.emitCommentPending();
				t.transition(Data.instance);
				break;
			default:
				r.unconsume();
				t.transition(Comment.instance);
		}
	}
}

class CommentStartDash extends TokeniserState {
	static instance = new CommentStartDash();
	read(t: Tokeniser, r: CharacterReader): void {
		let c = r.consume();
	let str = c.string;
		switch (c.string) {
			case '-':
				t.transition(CommentStartDash.instance);
				break;
			case TokeniserState.nullChar.string:
				t.error(this);
				t.commentPending.append(CommentStartDash.replacementChar);
				t.transition(Comment.instance);
				break;
			case '>':
				t.error(this);
				t.emitCommentPending();
				t.transition(Data.instance);
				break;
			case TokeniserState.eof:
				t.eofError(this);
				t.emitCommentPending();
				t.transition(Data.instance);
				break;
			default:
				t.commentPending.append(c);
				t.transition(Comment.instance);
		}
	}
}

class Comment extends TokeniserState {
	static instance = new Comment();
	read(t: Tokeniser, r: CharacterReader): void {
		let c = r.current();
		switch (c.string) {
			case '-':
				t.advanceTransition(CommentEndDash.instance);
				break;
			case TokeniserState.nullChar.string:
				t.error(this);
				r.advance();
				t.commentPending.append(Comment.replacementChar);
				break;
			case TokeniserState.eof:
				t.eofError(this);
				t.emitCommentPending();
				t.transition(Data.instance);
				break;
			default:
				t.commentPending.append(r.consumeToAny(['-', TokeniserState.nullChar.string]));
		}
	}
}
class CommentEndDash extends TokeniserState {
	static instance = new CommentEndDash();
	read(t: Tokeniser, r: CharacterReader): void {
		let c = r.consume();
	let str = c.string;
		switch (c.string) {
			case '-':
				t.transition(CommentEnd.instance);
				break;
			case TokeniserState.nullChar.string:
				t.error(this);
				t.commentPending.append('-').append(CommentEndDash.replacementChar);
				t.transition(Comment.instance);
				break;
			case TokeniserState.eof:
				t.eofError(this);
				t.emitCommentPending();
				t.transition(Data.instance);
				break;
			default:
				t.commentPending.append('-').append(c);
				t.transition(Comment.instance);
		}
	}
}

class CommentEnd extends TokeniserState {
	static instance = new CommentEnd();
	read(t: Tokeniser, r: CharacterReader): void {
		let c = r.consume();
	let str = c.string;
		switch (c.string) {
			case '>':
				t.emitCommentPending();
				t.transition(Data.instance);
				break;
			case TokeniserState.nullChar.string:
				t.error(this);
				t.commentPending.append('--').append(CommentEnd.replacementChar);
				t.transition(Comment.instance);
				break;
			case '!':
				t.error(this);
				t.transition(CommentEndBang.instance);
				break;
			case '-':
				t.error(this);
				t.commentPending.append('-');
				break;
			case TokeniserState.eof:
				t.eofError(this);
				t.emitCommentPending();
				t.transition(Data.instance);
				break;
			default:
				t.error(this);
				t.commentPending.append('--').append(c);
				t.transition(Comment.instance);
		}
	}
}

class CommentEndBang extends TokeniserState {
	static instance = new CommentEndBang();
	read(t: Tokeniser, r: CharacterReader): void {
		let c = r.consume();
	let str = c.string;
		switch (c.string) {
			case '-':
				t.commentPending.append('--!');
				t.transition(CommentEndDash.instance);
				break;
			case '>':
				t.emitCommentPending();
				t.transition(Data.instance);
				break;
			case TokeniserState.nullChar.string:
				t.error(this);
				t.commentPending.append('--!').append(CommentEndBang.replacementChar);
				t.transition(Comment.instance);
				break;
			case TokeniserState.eof:
				t.eofError(this);
				t.emitCommentPending();
				t.transition(Data.instance);
				break;
			default:
				t.commentPending.append('--!').append(c);
				t.transition(Comment.instance);
		}
	}
}

class Doctype extends TokeniserState {
	static instance = new Doctype();
	read(t: Tokeniser, r: CharacterReader): void {
		let c = r.consume();
	let str = c.string;
		switch (c.string) {
			case '\t':
			case '\n':
			case '\r':
			case '\f':
			case ' ':
				t.transition(BeforeDoctypeName.instance);
				break;
			case TokeniserState.eof:
				t.eofError(this);
			// note: fall through to > case
			case '>': // catch invalid <!DOCTYPE>
				t.error(this);
				t.createDoctypePending();
				t.doctypePending.forceQuirks = true;
				t.emitDoctypePending();
				t.transition(Data.instance);
				break;
			default:
				t.error(this);
				t.transition(BeforeDoctypeName.instance);
		}
	}
}
class BeforeDoctypeName extends TokeniserState {
	static instance = new BeforeDoctypeName();
	read(t: Tokeniser, r: CharacterReader): void {
		if (r.matchesLetter()) {
			t.createDoctypePending();
			t.transition(DoctypeName.instance);
			return;
		}
		let c = r.consume();
	let str = c.string;
		switch (c.string) {
			case '\t':
			case '\n':
			case '\r':
			case '\f':
			case ' ':
				break; // ignore whitespace
			case TokeniserState.nullChar.string:
				t.error(this);
				t.createDoctypePending();
				t.doctypePending.name.append(BeforeDoctypeName.replacementChar);
				t.transition(DoctypeName.instance);
				break;
			case TokeniserState.eof:
				t.eofError(this);
				t.createDoctypePending();
				t.doctypePending.forceQuirks = true;
				t.emitDoctypePending();
				t.transition(Data.instance);
				break;
			default:
				t.createDoctypePending();
				t.doctypePending.name.append(c);
				t.transition(DoctypeName.instance);
		}
	}
}

class DoctypeName extends TokeniserState {
	static instance = new DoctypeName();
	read(t: Tokeniser, r: CharacterReader): void {
		if (r.matchesLetter()) {
			let name = r.consumeLetterSequence();
			t.doctypePending.name.append(name);
			return;
		}
		let c = r.consume();
	let str = c.string;
		switch (c.string) {
			case '>':
				t.emitDoctypePending();
				t.transition(Data.instance);
				break;
			case '\t':
			case '\n':
			case '\r':
			case '\f':
			case ' ':
				t.transition(AfterDoctypeName.instance);
				break;
			case TokeniserState.nullChar.string:
				t.error(this);
				t.doctypePending.name.append(DoctypeName.replacementChar);
				break;
			case TokeniserState.eof:
				t.eofError(this);
				t.doctypePending.forceQuirks = true;
				t.emitDoctypePending();
				t.transition(Data.instance);
				break;
			default:
				t.doctypePending.name.append(c);
		}
	}
}

class AfterDoctypeName extends TokeniserState {
	static instance = new AfterDoctypeName();
	read(t: Tokeniser, r: CharacterReader): void {
		if (r.isEmpty()) {
			t.eofError(this);
			t.doctypePending.forceQuirks = true;
			t.emitDoctypePending();
			t.transition(Data.instance);
			return;
		}
		if (r.matchesAny(['\t', '\n', '\r', '\f', ' '])) r.advance();
		// ignore whitespace
		else if (r.matches('>')) {
			t.emitDoctypePending();
			t.advanceTransition(Data.instance);
		} else if (r.matchConsumeIgnoreCase(DocumentType.PUBLIC_KEY)) {
			t.doctypePending.pubSysKey = DocumentType.PUBLIC_KEY;
			t.transition(AfterDoctypePublicKeyword.instance);
		} else if (r.matchConsumeIgnoreCase(DocumentType.SYSTEM_KEY)) {
			t.doctypePending.pubSysKey = DocumentType.SYSTEM_KEY;
			t.transition(AfterDoctypeSystemKeyword.instance);
		} else {
			t.error(this);
			t.doctypePending.forceQuirks = true;
			t.advanceTransition(BogusDoctype.instance);
		}
	}
}

class AfterDoctypePublicKeyword extends TokeniserState {
	static instance = new AfterDoctypePublicKeyword();
	read(t: Tokeniser, r: CharacterReader): void {
		let c = r.consume();
	let str = c.string;
		switch (c.string) {
			case '\t':
			case '\n':
			case '\r':
			case '\f':
			case ' ':
				t.transition(BeforeDoctypePublicIdentifier.instance);
				break;
			case '"':
				t.error(this);
				// set public id to empty string
				t.transition(DoctypePublicIdentifier_doubleQuoted.instance);
				break;
			case "'":
				t.error(this);
				// set public id to empty string
				t.transition(DoctypePublicIdentifier_singleQuoted.instance);
				break;
			case '>':
				t.error(this);
				t.doctypePending.forceQuirks = true;
				t.emitDoctypePending();
				t.transition(Data.instance);
				break;
			case TokeniserState.eof:
				t.eofError(this);
				t.doctypePending.forceQuirks = true;
				t.emitDoctypePending();
				t.transition(Data.instance);
				break;
			default:
				t.error(this);
				t.doctypePending.forceQuirks = true;
				t.transition(BogusDoctype.instance);
		}
	}
}
class BeforeDoctypePublicIdentifier extends TokeniserState {
	static instance = new BeforeDoctypePublicIdentifier();
	read(t: Tokeniser, r: CharacterReader): void {
		let c = r.consume();
	let str = c.string;
		switch (c.string) {
			case '\t':
			case '\n':
			case '\r':
			case '\f':
			case ' ':
				break;
			case '"':
				// set public id to empty string
				t.transition(DoctypePublicIdentifier_doubleQuoted.instance);
				break;
			case "'":
				// set public id to empty string
				t.transition(DoctypePublicIdentifier_singleQuoted.instance);
				break;
			case '>':
				t.error(this);
				t.doctypePending.forceQuirks = true;
				t.emitDoctypePending();
				t.transition(Data.instance);
				break;
			case TokeniserState.eof:
				t.eofError(this);
				t.doctypePending.forceQuirks = true;
				t.emitDoctypePending();
				t.transition(Data.instance);
				break;
			default:
				t.error(this);
				t.doctypePending.forceQuirks = true;
				t.transition(BogusDoctype.instance);
		}
	}
}

class DoctypePublicIdentifier_doubleQuoted extends TokeniserState {
	static instance = new DoctypePublicIdentifier_doubleQuoted();
	read(t: Tokeniser, r: CharacterReader): void {
		let c = r.consume();
	let str = c.string;
		switch (c.string) {
			case '"':
				t.transition(AfterDoctypePublicIdentifier.instance);
				break;
			case TokeniserState.nullChar.string:
				t.error(this);
				t.doctypePending.publicIdentifier.append(DoctypePublicIdentifier_doubleQuoted.replacementChar);
				break;
			case '>':
				t.error(this);
				t.doctypePending.forceQuirks = true;
				t.emitDoctypePending();
				t.transition(Data.instance);
				break;
			case TokeniserState.eof:
				t.eofError(this);
				t.doctypePending.forceQuirks = true;
				t.emitDoctypePending();
				t.transition(Data.instance);
				break;
			default:
				t.doctypePending.publicIdentifier.append(c);
		}
	}
}

class DoctypePublicIdentifier_singleQuoted extends TokeniserState {
	static instance = new DoctypePublicIdentifier_singleQuoted();
	read(t: Tokeniser, r: CharacterReader): void {
		let c = r.consume();
	let str = c.string;
		switch (c.string) {
			case "'":
				t.transition(AfterDoctypePublicIdentifier.instance);
				break;
			case TokeniserState.nullChar.string:
				t.error(this);
				t.doctypePending.publicIdentifier.append(DoctypePublicIdentifier_singleQuoted.replacementChar);
				break;
			case '>':
				t.error(this);
				t.doctypePending.forceQuirks = true;
				t.emitDoctypePending();
				t.transition(Data.instance);
				break;
			case TokeniserState.eof:
				t.eofError(this);
				t.doctypePending.forceQuirks = true;
				t.emitDoctypePending();
				t.transition(Data.instance);
				break;
			default:
				t.doctypePending.publicIdentifier.append(c);
		}
	}
}

class AfterDoctypePublicIdentifier extends TokeniserState {
	static instance = new AfterDoctypePublicIdentifier();
	read(t: Tokeniser, r: CharacterReader): void {
		let c = r.consume();
	let str = c.string;
		switch (c.string) {
			case '\t':
			case '\n':
			case '\r':
			case '\f':
			case ' ':
				t.transition(BetweenDoctypePublicAndSystemIdentifiers.instance);
				break;
			case '>':
				t.emitDoctypePending();
				t.transition(Data.instance);
				break;
			case '"':
				t.error(this);
				// system id empty
				t.transition(DoctypeSystemIdentifier_doubleQuoted.instance);
				break;
			case "'":
				t.error(this);
				// system id empty
				t.transition(DoctypeSystemIdentifier_singleQuoted.instance);
				break;
			case TokeniserState.eof:
				t.eofError(this);
				t.doctypePending.forceQuirks = true;
				t.emitDoctypePending();
				t.transition(Data.instance);
				break;
			default:
				t.error(this);
				t.doctypePending.forceQuirks = true;
				t.transition(BogusDoctype.instance);
		}
	}
}
class BetweenDoctypePublicAndSystemIdentifiers extends TokeniserState {
	static instance = new BetweenDoctypePublicAndSystemIdentifiers();
	read(t: Tokeniser, r: CharacterReader): void {
		let c = r.consume();
	let str = c.string;
		switch (c.string) {
			case '\t':
			case '\n':
			case '\r':
			case '\f':
			case ' ':
				break;
			case '>':
				t.emitDoctypePending();
				t.transition(Data.instance);
				break;
			case '"':
				t.error(this);
				// system id empty
				t.transition(DoctypeSystemIdentifier_doubleQuoted.instance);
				break;
			case "'":
				t.error(this);
				// system id empty
				t.transition(DoctypeSystemIdentifier_singleQuoted.instance);
				break;
			case TokeniserState.eof:
				t.eofError(this);
				t.doctypePending.forceQuirks = true;
				t.emitDoctypePending();
				t.transition(Data.instance);
				break;
			default:
				t.error(this);
				t.doctypePending.forceQuirks = true;
				t.transition(BogusDoctype.instance);
		}
	}
}

class AfterDoctypeSystemKeyword extends TokeniserState {
	static instance = new AfterDoctypeSystemKeyword();
	read(t: Tokeniser, r: CharacterReader): void {
		let c = r.consume();
	let str = c.string;
		switch (c.string) {
			case '\t':
			case '\n':
			case '\r':
			case '\f':
			case ' ':
				t.transition(BeforeDoctypeSystemIdentifier.instance);
				break;
			case '>':
				t.error(this);
				t.doctypePending.forceQuirks = true;
				t.emitDoctypePending();
				t.transition(Data.instance);
				break;
			case '"':
				t.error(this);
				// system id empty
				t.transition(DoctypeSystemIdentifier_doubleQuoted.instance);
				break;
			case "'":
				t.error(this);
				// system id empty
				t.transition(DoctypeSystemIdentifier_singleQuoted.instance);
				break;
			case TokeniserState.eof:
				t.eofError(this);
				t.doctypePending.forceQuirks = true;
				t.emitDoctypePending();
				t.transition(Data.instance);
				break;
			default:
				t.error(this);
				t.doctypePending.forceQuirks = true;
				t.emitDoctypePending();
		}
	}
}

class BeforeDoctypeSystemIdentifier extends TokeniserState {
	static instance = new BeforeDoctypeSystemIdentifier();
	read(t: Tokeniser, r: CharacterReader): void {
		let c = r.consume();
	let str = c.string;
		switch (c.string) {
			case '\t':
			case '\n':
			case '\r':
			case '\f':
			case ' ':
				break;
			case '"':
				// set system id to empty string
				t.transition(DoctypeSystemIdentifier_doubleQuoted.instance);
				break;
			case "'":
				// set public id to empty string
				t.transition(DoctypeSystemIdentifier_singleQuoted.instance);
				break;
			case '>':
				t.error(this);
				t.doctypePending.forceQuirks = true;
				t.emitDoctypePending();
				t.transition(Data.instance);
				break;
			case TokeniserState.eof:
				t.eofError(this);
				t.doctypePending.forceQuirks = true;
				t.emitDoctypePending();
				t.transition(Data.instance);
				break;
			default:
				t.error(this);
				t.doctypePending.forceQuirks = true;
				t.transition(BogusDoctype.instance);
		}
	}
}

class DoctypeSystemIdentifier_doubleQuoted extends TokeniserState {
	static instance = new DoctypeSystemIdentifier_doubleQuoted();
	read(t: Tokeniser, r: CharacterReader): void {
		let c = r.consume();
	let str = c.string;
		switch (c.string) {
			case '"':
				t.transition(AfterDoctypeSystemIdentifier.instance);
				break;
			case TokeniserState.nullChar.string:
				t.error(this);
				t.doctypePending.systemIdentifier.append(DoctypeSystemIdentifier_doubleQuoted.replacementChar);
				break;
			case '>':
				t.error(this);
				t.doctypePending.forceQuirks = true;
				t.emitDoctypePending();
				t.transition(Data.instance);
				break;
			case TokeniserState.eof:
				t.eofError(this);
				t.doctypePending.forceQuirks = true;
				t.emitDoctypePending();
				t.transition(Data.instance);
				break;
			default:
				t.doctypePending.systemIdentifier.append(c);
		}
	}
}

class DoctypeSystemIdentifier_singleQuoted extends TokeniserState {
	static instance = new DoctypeSystemIdentifier_singleQuoted();
	read(t: Tokeniser, r: CharacterReader): void {
		let c = r.consume();
	let str = c.string;
		switch (c.string) {
			case "'":
				t.transition(AfterDoctypeSystemIdentifier.instance);
				break;
			case TokeniserState.nullChar.string:
				t.error(this);
				t.doctypePending.systemIdentifier.append(DoctypeSystemIdentifier_singleQuoted.replacementChar);
				break;
			case '>':
				t.error(this);
				t.doctypePending.forceQuirks = true;
				t.emitDoctypePending();
				t.transition(Data.instance);
				break;
			case TokeniserState.eof:
				t.eofError(this);
				t.doctypePending.forceQuirks = true;
				t.emitDoctypePending();
				t.transition(Data.instance);
				break;
			default:
				t.doctypePending.systemIdentifier.append(c);
		}
	}
}

class AfterDoctypeSystemIdentifier extends TokeniserState {
	static instance = new AfterDoctypeSystemIdentifier();
	read(t: Tokeniser, r: CharacterReader): void {
		let c = r.consume();
	let str = c.string;
		switch (c.string) {
			case '\t':
			case '\n':
			case '\r':
			case '\f':
			case ' ':
				break;
			case '>':
				t.emitDoctypePending();
				t.transition(Data.instance);
				break;
			case AfterDoctypeSystemIdentifier.eof:
				t.eofError(this);
				t.doctypePending.forceQuirks = true;
				t.emitDoctypePending();
				t.transition(Data.instance);
				break;
			default:
				t.error(this);
				t.transition(BogusDoctype.instance);
			// NOT force quirks
		}
	}
}

class BogusDoctype extends TokeniserState {
	static instance = new BogusDoctype();
	read(t: Tokeniser, r: CharacterReader): void {
		let c = r.consume();
let str = c.string;
		switch (c.string) {
			case '>':
				t.emitDoctypePending();
				t.transition(Data.instance);
				break;
			case BogusDoctype.eof:
				t.emitDoctypePending();
				t.transition(Data.instance);
				break;
			default:
				// ignore char
				break;
		}
	}
}

class CdataSection extends TokeniserState {
	static instance = new CdataSection();
	read(t: Tokeniser, r: CharacterReader): void {
		let data = r.consumeTo(']]>');
		t.dataBuffer.append(data);
		if (r.matchConsume("]]>") || r.isEmpty()) {
			t.emit(new NSToken.CData(t.dataBuffer.toString()));
			t.transition(Data.instance);
		}
	}
}

export abstract class TokeniserStateNS {
	static Data = Data.instance;
	static CharacterReferenceInData = CharacterReferenceInData.instance;
	static Rcdata = Rcdata.instance; 
	static CharacterReferenceInRcdata = CharacterReferenceInRcdata.instance;
	static Rawtext = Rawtext.instance;
	static ScriptData = ScriptData.instance;
	static PLAINTEXT = PLAINTEXT.instance; 
	static TagOpen = TagOpen.instance; 
	static EndTagOpen = EndTagOpen.instance;
	static TagName = TagName.instance; 
	static RcdataLessthanSign = RcdataLessthanSign.instance; 
	static RCDATAEndTagOpen = RCDATAEndTagOpen.instance; 
	static RCDATAEndTagName = RCDATAEndTagName.instance;
	static RawtextLessthanSign = RawtextLessthanSign.instance;
	static RawtextEndTagOpen = RawtextEndTagOpen.instance;
	static RawtextEndTagName = RawtextEndTagName.instance;
	static ScriptDataLessthanSign = ScriptDataLessthanSign.instance;
	static ScriptDataEndTagOpen = ScriptDataEndTagOpen.instance; 
	static ScriptDataEndTagName = ScriptDataEndTagName.instance;
	static ScriptDataEscapeStart = ScriptDataEscapeStart.instance;
	static ScriptDataEscapeStartDash = ScriptDataEscapeStartDash.instance; 
	static ScriptDataEscaped = ScriptDataEscaped.instance;
	static ScriptDataEscapedDash = ScriptDataEscapedDash.instance;
	static ScriptDataEscapedDashDash = ScriptDataEscapedDashDash.instance;
	static ScriptDataEscapedLessthanSign = ScriptDataEscapedLessthanSign.instance;
	static ScriptDataEscapedEndTagOpen = ScriptDataEscapedEndTagOpen.instance; 
	static ScriptDataEscapedEndTagName = ScriptDataEscapedEndTagName.instance; 
	static ScriptDataDoubleEscapeStart = ScriptDataDoubleEscapeStart.instance; 
	static ScriptDataDoubleEscaped = ScriptDataDoubleEscaped.instance;
	static ScriptDataDoubleEscapedDash = ScriptDataDoubleEscapedDash.instance; 
	static ScriptDataDoubleEscapedDashDash = ScriptDataDoubleEscapedDashDash.instance; 
	static ScriptDataDoubleEscapedLessthanSign = ScriptDataDoubleEscapedLessthanSign.instance; 
	static ScriptDataDoubleEscapeEnd = ScriptDataDoubleEscapeEnd.instance;
	static BeforeAttributeName = BeforeAttributeName.instance;
	static AttributeName = AttributeName.instance;
	static AfterAttributeName = AfterAttributeName.instance;
	static BeforeAttributeValue = BeforeAttributeValue.instance; 
	static AttributeValue_doubleQuoted = AttributeValue_doubleQuoted.instance;
	static AttributeValue_singleQuoted = AttributeValue_singleQuoted.instance; 
	static AttributeValue_unquoted = AttributeValue_unquoted.instance;
	static AfterAttributeValue_quoted = AfterAttributeValue_quoted.instance;
	static SelfClosingStartTag = SelfClosingStartTag.instance;
	static BogusComment = BogusComment.instance;
	static MarkupDeclarationOpen = MarkupDeclarationOpen.instance; 
	static CommentStart = CommentStart.instance;
	static CommentStartDash = CommentStartDash.instance; 
	static Comment = Comment.instance; 
	static CommentEndDash = CommentEndDash.instance;
	static CommentEnd = CommentEnd.instance;
	static CommentEndBang = CommentEndBang.instance;
	static Doctype = Doctype.instance;
	static BeforeDoctypeName = BeforeDoctypeName.instance;
	static DoctypeName = DoctypeName.instance;
	static AfterDoctypeName = AfterDoctypeName.instance; 
	static AfterDoctypePublicKeyword = AfterDoctypePublicKeyword.instance; 
	static BeforeDoctypePublicIdentifier = BeforeDoctypePublicIdentifier.instance; 
	static DoctypePublicIdentifier_doubleQuoted = DoctypePublicIdentifier_doubleQuoted.instance; 
	static DoctypePublicIdentifier_singleQuoted = DoctypePublicIdentifier_singleQuoted.instance; 
	static AfterDoctypePublicIdentifier = AfterDoctypePublicIdentifier.instance;
	static BetweenDoctypePublicAndSystemIdentifiers = BetweenDoctypePublicAndSystemIdentifiers.instance;
	static AfterDoctypeSystemKeyword = AfterDoctypeSystemKeyword.instance; 
	static BeforeDoctypeSystemIdentifier = BeforeDoctypeSystemIdentifier.instance;
	static DoctypeSystemIdentifier_doubleQuoted = DoctypeSystemIdentifier_doubleQuoted.instance;
	static DoctypeSystemIdentifier_singleQuoted = DoctypeSystemIdentifier_singleQuoted.instance;
	static AfterDoctypeSystemIdentifier = AfterDoctypeSystemIdentifier.instance;
	static BogusDoctype = BogusDoctype.instance;
	static CdataSection = CdataSection.instance;
}