export interface EstimateTemplateItem {
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

export interface EstimateTemplate {
  id: string;
  name: string;
  description: string;
  /** Stage names this template is most relevant for, used to sort suggestions. */
  stages: string[];
  items: EstimateTemplateItem[];
}

/**
 * Ready-made estimate line sets so a foreman can start from a typical scope
 * of work instead of typing every position by hand. Quantities and prices
 * are placeholders meant to be edited after the template is applied.
 */
export const ESTIMATE_TEMPLATES: EstimateTemplate[] = [
  {
    id: "demolition",
    name: "Демонтаж под ключ",
    description: "Снос перегородок, демонтаж полов и старой отделки",
    stages: ["Демонтаж"],
    items: [
      { itemName: "Демонтаж перегородок", unit: "м²", quantity: 10, unitPrice: 450 },
      { itemName: "Демонтаж стяжки пола", unit: "м²", quantity: 40, unitPrice: 350 },
      { itemName: "Демонтаж старой плитки", unit: "м²", quantity: 15, unitPrice: 300 },
      { itemName: "Снятие обоев", unit: "м²", quantity: 60, unitPrice: 120 },
      { itemName: "Вывоз строительного мусора", unit: "м³", quantity: 6, unitPrice: 1800 }
    ]
  },
  {
    id: "electrical",
    name: "Электрика квартиры",
    description: "Разводка, подрозетники, щиток и точки",
    stages: ["Электрика"],
    items: [
      { itemName: "Штробление стен под кабель", unit: "м.п.", quantity: 60, unitPrice: 320 },
      { itemName: "Прокладка кабеля", unit: "м.п.", quantity: 120, unitPrice: 150 },
      { itemName: "Установка подрозетника", unit: "шт", quantity: 30, unitPrice: 350 },
      { itemName: "Монтаж розетки / выключателя", unit: "шт", quantity: 30, unitPrice: 300 },
      { itemName: "Сборка и установка щитка", unit: "шт", quantity: 1, unitPrice: 12000 }
    ]
  },
  {
    id: "plumbing",
    name: "Сантехника (санузел)",
    description: "Разводка труб, установка приборов",
    stages: ["Сантехника"],
    items: [
      { itemName: "Разводка труб водоснабжения", unit: "точка", quantity: 6, unitPrice: 2500 },
      { itemName: "Монтаж канализации", unit: "точка", quantity: 3, unitPrice: 2200 },
      { itemName: "Установка унитаза", unit: "шт", quantity: 1, unitPrice: 3500 },
      { itemName: "Установка ванны / душевой", unit: "шт", quantity: 1, unitPrice: 6000 },
      { itemName: "Установка смесителя", unit: "шт", quantity: 2, unitPrice: 1500 }
    ]
  },
  {
    id: "bathroom",
    name: "Ремонт ванной под ключ",
    description: "Полный цикл: гидроизоляция, плитка, сантехника",
    stages: ["Плитка", "Сантехника"],
    items: [
      { itemName: "Гидроизоляция пола и стен", unit: "м²", quantity: 20, unitPrice: 550 },
      { itemName: "Выравнивание стен под плитку", unit: "м²", quantity: 25, unitPrice: 700 },
      { itemName: "Укладка плитки на стены", unit: "м²", quantity: 25, unitPrice: 1400 },
      { itemName: "Укладка плитки на пол", unit: "м²", quantity: 5, unitPrice: 1300 },
      { itemName: "Затирка швов", unit: "м²", quantity: 30, unitPrice: 250 }
    ]
  },
  {
    id: "plaster",
    name: "Штукатурка и шпаклёвка",
    description: "Выравнивание стен и потолков под покраску",
    stages: ["Штукатурка"],
    items: [
      { itemName: "Грунтовка стен", unit: "м²", quantity: 80, unitPrice: 80 },
      { itemName: "Штукатурка стен по маякам", unit: "м²", quantity: 80, unitPrice: 750 },
      { itemName: "Шпаклёвка стен в 2 слоя", unit: "м²", quantity: 80, unitPrice: 480 },
      { itemName: "Шлифовка поверхности", unit: "м²", quantity: 80, unitPrice: 180 }
    ]
  },
  {
    id: "screed",
    name: "Стяжка пола",
    description: "Подготовка основания и заливка",
    stages: ["Стяжка"],
    items: [
      { itemName: "Грунтовка основания", unit: "м²", quantity: 45, unitPrice: 90 },
      { itemName: "Устройство демпферной ленты", unit: "м.п.", quantity: 30, unitPrice: 120 },
      { itemName: "Стяжка пола 50 мм", unit: "м²", quantity: 45, unitPrice: 850 },
      { itemName: "Наливной пол (финиш)", unit: "м²", quantity: 45, unitPrice: 450 }
    ]
  },
  {
    id: "flooring",
    name: "Укладка ламината",
    description: "Подложка, укладка, плинтус",
    stages: ["Ламинат"],
    items: [
      { itemName: "Укладка подложки", unit: "м²", quantity: 40, unitPrice: 120 },
      { itemName: "Укладка ламината", unit: "м²", quantity: 40, unitPrice: 600 },
      { itemName: "Монтаж плинтуса", unit: "м.п.", quantity: 45, unitPrice: 350 },
      { itemName: "Установка порожков", unit: "шт", quantity: 4, unitPrice: 600 }
    ]
  },
  {
    id: "painting",
    name: "Покраска стен и потолков",
    description: "Подготовка и финишная окраска",
    stages: ["Покраска"],
    items: [
      { itemName: "Грунтовка перед покраской", unit: "м²", quantity: 80, unitPrice: 90 },
      { itemName: "Покраска стен в 2 слоя", unit: "м²", quantity: 60, unitPrice: 420 },
      { itemName: "Покраска потолка в 2 слоя", unit: "м²", quantity: 20, unitPrice: 480 },
      { itemName: "Окраска откосов", unit: "м.п.", quantity: 12, unitPrice: 350 }
    ]
  }
];

export function getTemplate(id: string): EstimateTemplate | undefined {
  return ESTIMATE_TEMPLATES.find((t) => t.id === id);
}

/** Templates whose declared stages match the given stage name come first. */
export function templatesForStage(stageName: string): EstimateTemplate[] {
  return [...ESTIMATE_TEMPLATES].sort((a, b) => {
    const aMatch = a.stages.includes(stageName) ? 0 : 1;
    const bMatch = b.stages.includes(stageName) ? 0 : 1;
    return aMatch - bMatch;
  });
}
