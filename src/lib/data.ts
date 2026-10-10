export const posts = [
  {
    tag: "ზოგადი",
    comments: 3,
    views: 84,
    title: "ყველაზე ცუდი ანიმე",
    body: "რომელი ანიმე ნახე და ყველაზე მეტად არ მოგეწონა?",
    user: "Vxuh",
    handle: "u/Vxuh · 1 დღის წინ",
    avatar: "/assets/avatars/Vxuh.png",
  },
  {
    tag: "ზოგადი",
    comments: 8,
    views: 55,
    title: "🔥 ვინ არის ყველაზე საძულველი ანიმეს პერსონაჟი?",
    body: "გოჯო? იჩიგო? გოკუ? ნარუტო? აიანოკოჯი? ჯინ-ვუ? თუ სხვა — დაწერე შენი არჩევანი.",
    user: "Izuku .M",
    handle: "u/mhabaku12 · 1 დღის წინ",
    avatar: "/assets/avatars/mhabaku12.png",
  },
  {
    tag: "ზოგადი",
    comments: 4,
    views: 51,
    title: "გამოიცანი პერსონაჟი (თვალებით)",
    body: "ვნახოთ, ვინ არის ნამდვილი ანიმეს მცოდნე 🗿",
    user: "SL anime 🜲",
    handle: "u/SLanime · 22 სთ-ის წინ",
    avatar: "/assets/avatars/SLanime.png",
  },
  {
    tag: "ზოგადი",
    comments: 8,
    views: 47,
    title: "რომელი ანიმე ნახავდი პირველად, თავიდან რომ შეგეძლოს?",
    body: "მიზეზის თქმა აუცილებელი არ არის, მაგრამ საინტერესო იქნება.",
    user: "ducky",
    handle: "u/notducky · 1 დღის წინ",
    avatar: "/assets/avatars/notducky.png",
  },
  {
    tag: "ზოგადი",
    comments: 3,
    views: 31,
    title: "რამდენ ფულს აიღებდი უცნობზე დასაქორწინებლად?",
    body: "უბრალოდ სახალისო კითხვა — შენი ციფრი დაწერე.",
    user: "4shadow",
    handle: "u/4shadow · 22 სთ-ის წინ",
    avatar: "/assets/avatars/4shadow.png",
  },
];

const ratings = new Set(["PG-13", "PG", "G", "R-17+", "R", "R+", "17+", "13+", "18+", "16+"]);

export function art(item: { poster?: string; banner?: string }) {
  return item.poster || item.banner || "";
}

export function hasRating(value?: string) {
  return !!value && ratings.has(value);
}

export function formatCount(value: number) {
  return Math.trunc(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

export function animeHref(slug: string) {
  return `/anime/${encodeURIComponent(slug)}`;
}
