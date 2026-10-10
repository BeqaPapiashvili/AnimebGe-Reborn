import "server-only";
import mysql, { type Pool, type RowDataPacket, type ResultSetHeader } from "mysql2/promise";

const globalForDb = globalThis as unknown as { dbPool?: Pool };

export const db =
  globalForDb.dbPool ??
  mysql.createPool({
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "newab",
    charset: "utf8mb4",
    connectionLimit: 10,
    dateStrings: true,
    stringifyObjects: true,
  });

if (process.env.NODE_ENV !== "production") globalForDb.dbPool = db;

export async function query<T = RowDataPacket>(sql: string, params: unknown[] = []) {
  const [rows] = await db.query<RowDataPacket[]>(sql, params);
  return rows as T[];
}

export async function execute(sql: string, params: unknown[] = []) {
  const [result] = await db.query<ResultSetHeader>(sql, params);
  return result;
}
