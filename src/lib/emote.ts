import type { RowDataPacket } from "mysql2";
import { db, query } from "@/lib/db";

export const emotes = [
  { id: 1, emoji: "😍", label: "მომწონს", column: "emoteOne" },
  { id: 2, emoji: "😂", label: "სასაცილო", column: "emoteTwo" },
  { id: 3, emoji: "😮", label: "ვაუ", column: "emoteThree" },
  { id: 4, emoji: "😐", label: "მოსაწყენია", column: "emoteFour" },
  { id: 5, emoji: "😡", label: "მაღიზიანებს", column: "emoteFive" },
  { id: 6, emoji: "😒", label: "ცუდი", column: "emoteSix" },
] as const;

export type EmoteId = (typeof emotes)[number]["id"];
export type EmoteCard = { id: EmoteId; emoji: string; label: string; count: number };
export type EmoteState = { items: EmoteCard[]; mine: EmoteId | null };

const shown: EmoteId[] = [4, 1, 3];
const columnOf = new Map(emotes.map((item) => [item.id, item.column]));

export async function readEmotes(postId: number, userId?: number): Promise<EmoteState> {
  const [row] = await query<Record<string, number | null>>("SELECT emoteOne, emoteTwo, emoteThree, emoteFour, emoteFive, emoteSix FROM dle_post_extras WHERE news_id = ? LIMIT 1", [postId]);
  const mineRows = userId ? await query<{ emote: number }>("SELECT emote FROM dle_emote_rating_log WHERE newsId = ? AND userId = ? ORDER BY emoteLogId DESC LIMIT 1", [postId, userId]) : [];
  const mine = mineRows[0] && columnOf.has(mineRows[0].emote as EmoteId) ? (mineRows[0].emote as EmoteId) : null;
  return {
    mine,
    items: shown.map((id) => emotes.find((item) => item.id === id)!).map((item) => ({ id: item.id, emoji: item.emoji, label: item.label, count: Math.max(0, Number(row?.[item.column]) || 0) })),
  };
}

export async function setEmote(userId: number, postId: number, emote: EmoteId, ip: string) {
  const nextColumn = columnOf.get(emote);
  if (!nextColumn) return readEmotes(postId, userId);
  let fresh = false;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query<RowDataPacket[]>("SELECT emoteLogId, emote FROM dle_emote_rating_log WHERE newsId = ? AND userId = ? ORDER BY emoteLogId DESC LIMIT 1 FOR UPDATE", [postId, userId]);
    const previous = rows[0] as { emoteLogId: number; emote: number } | undefined;
    const old = previous && columnOf.has(previous.emote as EmoteId) ? (previous.emote as EmoteId) : 0;
    if (previous && old === emote) {
      await conn.query("DELETE FROM dle_emote_rating_log WHERE emoteLogId = ?", [previous.emoteLogId]);
      await conn.query(`UPDATE dle_post_extras SET ${nextColumn} = GREATEST(${nextColumn} - 1, 0) WHERE news_id = ?`, [postId]);
    } else if (!previous) {
      fresh = true;
      await conn.query("INSERT INTO dle_emote_rating_log (newsId, userId, ip, emote, date) VALUES (?, ?, ?, ?, NOW())", [postId, userId, ip, emote]);
      await conn.query(`UPDATE dle_post_extras SET ${nextColumn} = ${nextColumn} + 1 WHERE news_id = ?`, [postId]);
    } else {
      await conn.query("UPDATE dle_emote_rating_log SET emote = ?, ip = ?, date = NOW() WHERE emoteLogId = ?", [emote, ip, previous.emoteLogId]);
      const oldColumn = columnOf.get(old as EmoteId);
      if (oldColumn) await conn.query(`UPDATE dle_post_extras SET ${oldColumn} = GREATEST(${oldColumn} - 1, 0), ${nextColumn} = ${nextColumn} + 1 WHERE news_id = ?`, [postId]);
      else await conn.query(`UPDATE dle_post_extras SET ${nextColumn} = ${nextColumn} + 1 WHERE news_id = ?`, [postId]);
    }
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
  if (fresh) {
    const { awardEmote } = await import("@/lib/xp");
    await awardEmote(userId, postId);
  }
  return readEmotes(postId, userId);
}
