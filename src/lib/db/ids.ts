// Central place for generating client-side record ids, so every repo
// creates ids the same way (offline-safe: no server round-trip needed).
import { v4 as uuidv4 } from "uuid";

export function newId(): string {
  return uuidv4();
}

export function nowIso(): string {
  return new Date().toISOString();
}
