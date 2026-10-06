const U8_LENGTH = 1;
const U16_LENGTH = 2;
const U32_LENGTH = 4;

class OutsideTheFile extends Error {}

export class ByteView {
  private readonly view: DataView;

  constructor(private readonly bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  get length(): number {
    return this.bytes.byteLength;
  }

  u8(offset: number): number {
    this.require(offset, U8_LENGTH);
    return this.view.getUint8(offset);
  }

  u16(offset: number): number {
    this.require(offset, U16_LENGTH);
    return this.view.getUint16(offset, true);
  }

  u32(offset: number): number {
    this.require(offset, U32_LENGTH);
    return this.view.getUint32(offset, true);
  }

  startsWith(signature: readonly number[]): boolean {
    return (
      this.covers(0, signature.length) &&
      signature.every((value, index) => this.bytes[index] === value)
    );
  }

  ascii(offset: number, length: number): string {
    this.require(offset, length);
    return Array.from(this.bytes.subarray(offset, offset + length), (code) =>
      String.fromCharCode(code),
    ).join("");
  }

  utf16(offset: number, codeUnits: number): string {
    this.require(offset, codeUnits * U16_LENGTH);
    return Array.from({ length: codeUnits }, (_, index) =>
      String.fromCharCode(
        this.view.getUint16(offset + index * U16_LENGTH, true),
      ),
    ).join("");
  }

  private covers(offset: number, length: number): boolean {
    return (
      Number.isSafeInteger(offset) &&
      Number.isSafeInteger(length) &&
      offset >= 0 &&
      length >= 0 &&
      offset + length <= this.bytes.byteLength
    );
  }

  private require(offset: number, length: number): void {
    if (!this.covers(offset, length)) throw new OutsideTheFile();
  }
}

export function nullWhenOutsideTheFile<T>(read: () => T): T | null {
  try {
    return read();
  } catch (error) {
    if (error instanceof OutsideTheFile) return null;
    throw error;
  }
}
