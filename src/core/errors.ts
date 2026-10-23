export class KomiiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KomiiError";
  }
}
