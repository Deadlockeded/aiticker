import { KEYS, readRaw, writeRaw } from "./storage";
import { notifyStore } from "./binder";

/**
 * BINDER ROOMS — switchable presentation skins over the same collection
 * data. Rooms unlock by collection milestones (stored like achievements);
 * everything is presentation-only: same detail sheet, same interactions.
 */

export type RoomId = "binder" | "boardroom" | "call";

export interface Room {
  id: RoomId;
  name: string;
  unlockAt: number;
  condition: string;
}

export const ROOMS: Room[] = [
  { id: "binder", name: "The Binder", unlockAt: 0, condition: "" },
  { id: "boardroom", name: "The Boardroom", unlockAt: 20, condition: "20 cards" },
  { id: "call", name: "The Call", unlockAt: 40, condition: "40 cards" },
];

export function getRoomSnapshot(): string {
  return readRaw(KEYS.binderRoom) ?? "binder";
}

export function setRoom(id: RoomId) {
  writeRaw(KEYS.binderRoom, id);
  notifyStore();
}

/** Rooms already toasted (so the unlock moment fires exactly once). */
export function getToastedRooms(): string[] {
  try {
    return JSON.parse(readRaw(KEYS.roomsSeen) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function markRoomToasted(id: RoomId) {
  writeRaw(KEYS.roomsSeen, JSON.stringify([...new Set([...getToastedRooms(), id])]));
}
