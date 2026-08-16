// ┌───────────────────────────────────────────────────────────────────────┐
// │  ЭТО МЕНЮ-ЗАГЛУШКА.                                                   │
// │  Настоящего меню Veronni у меня нет, поэтому здесь типовая карта       │
// │  краковской пиццерии с правдоподобными ценами. Замените этот файл на   │
// │  реальное меню и выполните `npm run seed` — больше нигде править не    │
// │  нужно: агент читает меню из базы.                                     │
// └───────────────────────────────────────────────────────────────────────┘

export type MenuSeedItem = {
  id: string;
  category: "pizza" | "pasta" | "salad" | "dessert" | "drink" | "extra";
  name: string;
  description: string;
  size?: string;
  /** Цена в грошах: 3900 = 39,00 zł. */
  priceGr: number;
  vegetarian?: boolean;
  spicy?: boolean;
};

/** Человекочитаемые названия разделов — идут в меню для агента и в чек. */
export const categoryLabels: Record<MenuSeedItem["category"], string> = {
  pizza: "Pizza",
  pasta: "Makarony",
  salad: "Sałatki",
  dessert: "Desery",
  drink: "Napoje",
  extra: "Dodatki i sosy",
};

export const menu: MenuSeedItem[] = [
  // ── Pizza 32 cm ───────────────────────────────────────────────────────
  {
    id: "margherita-32",
    category: "pizza",
    name: "Margherita",
    description: "sos pomidorowy, mozzarella, bazylia",
    size: "32 cm",
    priceGr: 3200,
    vegetarian: true,
  },
  {
    id: "margherita-45",
    category: "pizza",
    name: "Margherita",
    description: "sos pomidorowy, mozzarella, bazylia",
    size: "45 cm",
    priceGr: 5400,
    vegetarian: true,
  },
  {
    id: "salami-32",
    category: "pizza",
    name: "Salami",
    description: "sos pomidorowy, mozzarella, salami pikantne",
    size: "32 cm",
    priceGr: 3900,
    spicy: true,
  },
  {
    id: "salami-45",
    category: "pizza",
    name: "Salami",
    description: "sos pomidorowy, mozzarella, salami pikantne",
    size: "45 cm",
    priceGr: 6200,
    spicy: true,
  },
  {
    id: "pepperoni-32",
    category: "pizza",
    name: "Pepperoni",
    description: "sos pomidorowy, mozzarella, pepperoni, papryczki jalapeño",
    size: "32 cm",
    priceGr: 4200,
    spicy: true,
  },
  {
    id: "pepperoni-45",
    category: "pizza",
    name: "Pepperoni",
    description: "sos pomidorowy, mozzarella, pepperoni, papryczki jalapeño",
    size: "45 cm",
    priceGr: 6600,
    spicy: true,
  },
  {
    id: "capricciosa-32",
    category: "pizza",
    name: "Capricciosa",
    description: "sos pomidorowy, mozzarella, szynka, pieczarki, oliwki",
    size: "32 cm",
    priceGr: 4100,
  },
  {
    id: "capricciosa-45",
    category: "pizza",
    name: "Capricciosa",
    description: "sos pomidorowy, mozzarella, szynka, pieczarki, oliwki",
    size: "45 cm",
    priceGr: 6400,
  },
  {
    id: "quattro-formaggi-32",
    category: "pizza",
    name: "Quattro Formaggi",
    description: "mozzarella, gorgonzola, parmezan, ser kozi, miód",
    size: "32 cm",
    priceGr: 4500,
    vegetarian: true,
  },
  {
    id: "quattro-formaggi-45",
    category: "pizza",
    name: "Quattro Formaggi",
    description: "mozzarella, gorgonzola, parmezan, ser kozi, miód",
    size: "45 cm",
    priceGr: 6900,
    vegetarian: true,
  },
  {
    id: "prosciutto-e-rucola-32",
    category: "pizza",
    name: "Prosciutto e Rucola",
    description: "mozzarella, szynka parmeńska, rukola, parmezan, pomidorki",
    size: "32 cm",
    priceGr: 4800,
  },
  {
    id: "prosciutto-e-rucola-45",
    category: "pizza",
    name: "Prosciutto e Rucola",
    description: "mozzarella, szynka parmeńska, rukola, parmezan, pomidorki",
    size: "45 cm",
    priceGr: 7400,
  },
  {
    id: "vegetariana-32",
    category: "pizza",
    name: "Vegetariana",
    description: "sos pomidorowy, mozzarella, cukinia, bakłażan, papryka, oliwki",
    size: "32 cm",
    priceGr: 3900,
    vegetarian: true,
  },
  {
    id: "vegetariana-45",
    category: "pizza",
    name: "Vegetariana",
    description: "sos pomidorowy, mozzarella, cukinia, bakłażan, papryka, oliwki",
    size: "45 cm",
    priceGr: 6100,
    vegetarian: true,
  },
  {
    id: "hawajska-32",
    category: "pizza",
    name: "Hawajska",
    description: "sos pomidorowy, mozzarella, szynka, ananas",
    size: "32 cm",
    priceGr: 3800,
  },
  {
    id: "diavola-32",
    category: "pizza",
    name: "Diavola",
    description: "sos pomidorowy, mozzarella, salami, chili, cebula, oliwa chili",
    size: "32 cm",
    priceGr: 4300,
    spicy: true,
  },
  {
    id: "frutti-di-mare-32",
    category: "pizza",
    name: "Frutti di Mare",
    description: "sos pomidorowy, mozzarella, owoce morza, czosnek, natka",
    size: "32 cm",
    priceGr: 5200,
  },
  {
    id: "calzone",
    category: "pizza",
    name: "Calzone",
    description: "zamknięta pizza: szynka, pieczarki, mozzarella, ricotta",
    size: "1 szt.",
    priceGr: 4200,
  },

  // ── Makarony ──────────────────────────────────────────────────────────
  {
    id: "carbonara",
    category: "pasta",
    name: "Spaghetti Carbonara",
    description: "guanciale, żółtko, pecorino, pieprz",
    priceGr: 3900,
  },
  {
    id: "bolognese",
    category: "pasta",
    name: "Tagliatelle Bolognese",
    description: "wołowina, sos pomidorowy, parmezan",
    priceGr: 4100,
  },
  {
    id: "penne-arrabbiata",
    category: "pasta",
    name: "Penne all'Arrabbiata",
    description: "pomidory, czosnek, chili, natka",
    priceGr: 3400,
    vegetarian: true,
    spicy: true,
  },
  {
    id: "lasagne",
    category: "pasta",
    name: "Lasagne al Forno",
    description: "wołowina, beszamel, parmezan",
    priceGr: 4400,
  },

  // ── Sałatki ───────────────────────────────────────────────────────────
  {
    id: "caprese",
    category: "salad",
    name: "Caprese",
    description: "pomidory, mozzarella di bufala, bazylia, oliwa",
    priceGr: 3200,
    vegetarian: true,
  },
  {
    id: "cezar",
    category: "salad",
    name: "Cezar z kurczakiem",
    description: "sałata rzymska, kurczak, grzanki, parmezan, sos cezar",
    priceGr: 3600,
  },

  // ── Desery ────────────────────────────────────────────────────────────
  {
    id: "tiramisu",
    category: "dessert",
    name: "Tiramisu",
    description: "klasyczne, robione u nas",
    priceGr: 2200,
    vegetarian: true,
  },
  {
    id: "panna-cotta",
    category: "dessert",
    name: "Panna cotta",
    description: "z sosem malinowym",
    priceGr: 2000,
    vegetarian: true,
  },

  // ── Napoje ────────────────────────────────────────────────────────────
  {
    id: "cola-05",
    category: "drink",
    name: "Coca-Cola",
    description: "butelka",
    size: "0,5 l",
    priceGr: 900,
    vegetarian: true,
  },
  {
    id: "cola-zero-05",
    category: "drink",
    name: "Coca-Cola Zero",
    description: "butelka",
    size: "0,5 l",
    priceGr: 900,
    vegetarian: true,
  },
  {
    id: "sprite-05",
    category: "drink",
    name: "Sprite",
    description: "butelka",
    size: "0,5 l",
    priceGr: 900,
    vegetarian: true,
  },
  {
    id: "woda-niegazowana",
    category: "drink",
    name: "Woda niegazowana",
    description: "butelka",
    size: "0,5 l",
    priceGr: 600,
    vegetarian: true,
  },
  {
    id: "sok-pomaranczowy",
    category: "drink",
    name: "Sok pomarańczowy",
    description: "świeżo wyciskany",
    size: "0,3 l",
    priceGr: 1400,
    vegetarian: true,
  },
  {
    id: "piwo-lane",
    category: "drink",
    name: "Piwo",
    description: "butelkowe, tylko przy odbiorze osobistym",
    size: "0,5 l",
    priceGr: 1200,
    vegetarian: true,
  },

  // ── Dodatki ───────────────────────────────────────────────────────────
  {
    id: "sos-czosnkowy",
    category: "extra",
    name: "Sos czosnkowy",
    description: "",
    size: "80 g",
    priceGr: 500,
    vegetarian: true,
  },
  {
    id: "sos-bbq",
    category: "extra",
    name: "Sos BBQ",
    description: "",
    size: "80 g",
    priceGr: 500,
    vegetarian: true,
  },
  {
    id: "oliwa-chili",
    category: "extra",
    name: "Oliwa chili",
    description: "",
    size: "50 ml",
    priceGr: 400,
    vegetarian: true,
    spicy: true,
  },
  {
    id: "dodatkowy-ser",
    category: "extra",
    name: "Dodatkowa mozzarella",
    description: "porcja sera na pizzę",
    priceGr: 700,
    vegetarian: true,
  },
];
