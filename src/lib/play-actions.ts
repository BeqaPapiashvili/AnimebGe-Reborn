"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { answerLabyrinth, answerTrade, awakenCopies, cancelTrade, bidOn, burnCopies, craftCopies, createDeck, featureCopy, joinGiveaway, likeDeck, listCopy, mergeStars, moveLabyrinth, openCaseFor, petAct, rateDubber, sellCopy, sendTrade, toggleCardLike, toggleWish, upgradeCopies, voteBattle } from "@/lib/play";

function go(path: string, note: string) {
  redirect(`${path}?note=${encodeURIComponent(note)}`);
}

function back(formData: FormData, fallback: string) {
  const path = String(formData.get("back") ?? "");
  return /^\/[a-z0-9/_-]*$/i.test(path) ? path : fallback;
}

async function actor() {
  const user = await getSession();
  if (!user) return null;
  return user;
}

export async function openCase(formData: FormData) {
  const user = await actor();
  if (!user) go("/packs", "შესვლა სჭირდება.");
  go("/packs", await openCaseFor(user!.id, Number(formData.get("id"))));
}

export async function sellCard(formData: FormData) {
  const user = await actor();
  if (!user) go("/cards/mine", "შესვლა სჭირდება.");
  go("/cards/mine", await sellCopy(user!.id, Number(formData.get("id"))));
}

export async function featureCard(formData: FormData) {
  const user = await actor();
  if (!user) go("/cards/mine", "შესვლა სჭირდება.");
  go("/cards/mine", await featureCopy(user!.id, Number(formData.get("id"))));
}

export async function starCard(formData: FormData) {
  const user = await actor();
  if (!user) go("/cards/mine", "შესვლა სჭირდება.");
  go("/cards/mine", await mergeStars(user!.id, Number(formData.get("card"))));
}

export async function sellListing(formData: FormData) {
  const user = await actor();
  if (!user) go("/market", "შესვლა სჭირდება.");
  go("/market", await listCopy(user!.id, Number(formData.get("id")), Number(formData.get("price")), Number(formData.get("buy"))));
}

export async function placeBid(formData: FormData) {
  const user = await actor();
  if (!user) go("/market", "შესვლა სჭირდება.");
  go("/market", await bidOn(user!.id, Number(formData.get("id")), Number(formData.get("amount")), formData.get("buy") === "1"));
}

export async function craftCards(formData: FormData) {
  const user = await actor();
  if (!user) go("/craft", "შესვლა სჭირდება.");
  go("/craft", await craftCopies(user!.id, formData.getAll("id").map(Number)));
}

export async function upgradeCards(formData: FormData) {
  const user = await actor();
  if (!user) go("/upgrade", "შესვლა სჭირდება.");
  go(`/upgrade?q=${encodeURIComponent(String(formData.get("q") ?? ""))}`, await upgradeCopies(user!.id, formData.getAll("id").map(Number), Number(formData.get("target"))));
}

export async function burnCards(formData: FormData) {
  const user = await actor();
  if (!user) go(back(formData, "/awaken"), "შესვლა სჭირდება.");
  go(back(formData, "/awaken"), await burnCopies(user!.id, formData.getAll("id").map(Number)));
}

export async function awakenCards(formData: FormData) {
  const user = await actor();
  if (!user) go(back(formData, "/awaken"), "შესვლა სჭირდება.");
  go(back(formData, "/awaken"), await awakenCopies(user!.id, formData.getAll("id").map(Number)));
}

export async function saveDeck(formData: FormData) {
  const user = await actor();
  if (!user) go(back(formData, "/decks"), "შესვლა სჭირდება.");
  go(back(formData, "/decks"), await createDeck(user!.id, String(formData.get("title") ?? ""), formData.getAll("card").map(Number), String(formData.get("text") ?? "")));
}

export async function loveDeck(formData: FormData) {
  const user = await actor();
  const id = Number(formData.get("id"));
  if (!user) go(`/decks/${id}`, "შესვლა სჭირდება.");
  go(`/decks/${id}`, await likeDeck(user!.id, id));
}

export async function offerTrade(formData: FormData) {
  const user = await actor();
  const card = Number(formData.get("card"));
  if (!user) go(`/cards/${card}`, "შესვლა სჭირდება.");
  go(`/cards/${card}`, await sendTrade(user!.id, Number(formData.get("offer")), Number(formData.get("wanted"))));
}

export async function resolveTrade(formData: FormData) {
  const user = await actor();
  if (!user) go(back(formData, "/trades"), "შესვლა სჭირდება.");
  if (formData.get("cancel") === "1") go(back(formData, "/trades"), await cancelTrade(user!.id, Number(formData.get("id"))));
  go(back(formData, "/trades"), await answerTrade(user!.id, Number(formData.get("id")), formData.get("accept") === "1"));
}

export async function likeCard(cardId: number) {
  const user = await actor();
  if (!user) return { ok: false as const, error: "შესვლა სჭირდება." };
  return toggleCardLike(user.id, cardId);
}

export async function wishCard(formData: FormData) {
  const user = await actor();
  const id = Number(formData.get("id"));
  if (!user) go(`/cards/${id}`, "შესვლა სჭირდება.");
  go(`/cards/${id}`, await toggleWish(user!.id, id));
}

export async function enterGiveaway(formData: FormData) {
  const user = await actor();
  if (!user) go("/giveaways", "შესვლა სჭირდება.");
  go("/giveaways", await joinGiveaway(user!.id, Number(formData.get("id"))));
}

export async function castVote(formData: FormData) {
  const user = await actor();
  if (!user) go("/battle", "შესვლა სჭირდება.");
  go("/battle", await voteBattle(user!.id, Number(formData.get("battle")), Number(formData.get("anime"))));
}

export async function scoreDubber(formData: FormData) {
  const user = await actor();
  const back = `/dubbers/${encodeURIComponent(String(formData.get("alt") ?? ""))}`;
  if (!user) go(back, "შესვლა სჭირდება.");
  go(back, await rateDubber(user!.id, Number(formData.get("id")), Number(formData.get("voice")), Number(formData.get("text")), Number(formData.get("emotion"))));
}

export async function touchPet(formData: FormData) {
  const user = await actor();
  if (!user) go("/pet", "შესვლა სჭირდება.");
  go("/pet", await petAct(user!.id, String(formData.get("act") ?? "")));
}

export async function stepLabyrinth(formData: FormData) {
  const user = await actor();
  if (!user) go("/labyrinth", "შესვლა სჭირდება.");
  go("/labyrinth", await moveLabyrinth(user!.id, Number(formData.get("x")), Number(formData.get("y"))));
}

export async function solveLabyrinth(formData: FormData) {
  const user = await actor();
  if (!user) go("/labyrinth", "შესვლა სჭირდება.");
  go("/labyrinth", await answerLabyrinth(user!.id, String(formData.get("answer") ?? "")));
}
