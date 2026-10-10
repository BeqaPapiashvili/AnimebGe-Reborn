export const builtInFonts = ["BOG", "Mkhedruli"] as const;

export const fontSlots = [
  { role: "nav", group: "მენიუ", label: "ზედა მენიუ", hint: "ჰედერის ბმულები და ღილაკები" },
  { role: "footer", group: "მენიუ", label: "ფეხი", hint: "ქვედა ზოლი" },
  { role: "page", group: "სათაურები", label: "გვერდის სათაური", hint: "დიდი სათაური გვერდის თავში" },
  { role: "section", group: "სათაურები", label: "სექციის სათაური", hint: "ბლოკის სათაური, მაგალითად ტრენდი" },
  { role: "card", group: "სათაურები", label: "ბარათის სახელი", hint: "ანიმეს, პოსტის და მაღაზიის სახელი" },
  { role: "body", group: "ტექსტი", label: "ჩვეულებრივი ტექსტი", hint: "ის, რასაც ცალკე ადგილი არ აქვს" },
  { role: "desc", group: "ტექსტი", label: "აღწერა", hint: "ანიმეს და პოსტის აღწერა" },
  { role: "comment", group: "ტექსტი", label: "კომენტარი", hint: "კომენტარის ტექსტი" },
  { role: "button", group: "მოქმედება", label: "ღილაკები", hint: "ქმედების ღილაკები მენიუს გარეთ" },
  { role: "field", group: "მოქმედება", label: "ველები", hint: "ძებნა, ფორმები, კომენტარის ველი" },
] as const;

export type FontRole = (typeof fontSlots)[number]["role"];

export type SiteFont = {
  id: number;
  name: string;
  family: string;
  file: string;
  builtIn: boolean;
};
