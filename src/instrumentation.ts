export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;
  setTimeout(() => {
    import("@/lib/stills").then(({ warmAllStills }) => warmAllStills()).catch((error) => console.error("stills warm", error));
  }, 15_000);
}
