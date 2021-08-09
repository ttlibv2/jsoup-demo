export class OdError {

  static e400(code?: string, msg?: string): OdError {
    return new OdError(400, code, msg);
  }

  static e500(code?: string, msg?: string): OdError {
    return new OdError(500, code, msg);
  }
  
  constructor(
    public status: number,
    public code?: string,
    public message?: string,
    public error?: any) {
  }

  set_code(code: string): this {
    this.code = code;
    return this;
  }

  set_status(status: number): this {
    this.status = status;
    return this;
  }

  set_msg(message: string): this {
    this.message = message;
    return this;
  }

  set_error(object: any): this {
    this.error = object;
    return this;
  }

  toString(): string {
    return `${this.constructor.name}: ${this.message}`;
  }

}