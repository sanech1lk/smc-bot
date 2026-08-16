// Деньги живут целыми числами в грошах и нигде не превращаются в float.
// Классика: 19.90 + 0.10 в double даёт 20.000000000000004, и рано или поздно
// это вылезает в чеке клиента.

export const GROSZ_IN_ZLOTY = 100;

/** «19.90» или «19,90» → 1990. Бросает, если строка не похожа на цену. */
export function parsePrice(input: string): number {
  const normalized = input.trim().replace(",", ".");
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) throw new Error(`Не цена: ${input}`);
  const zloty = Number(match[1]);
  const grosz = Number((match[2] ?? "0").padEnd(2, "0"));
  return zloty * GROSZ_IN_ZLOTY + grosz;
}

/** 1990 → «19,90 zł». Польская запись — запятая как разделитель. */
export function formatPrice(grosz: number): string {
  if (!Number.isInteger(grosz)) throw new Error(`Гроши должны быть целыми: ${grosz}`);
  const sign = grosz < 0 ? "-" : "";
  const abs = Math.abs(grosz);
  const zloty = Math.floor(abs / GROSZ_IN_ZLOTY);
  const rest = abs % GROSZ_IN_ZLOTY;
  return `${sign}${zloty},${String(rest).padStart(2, "0")} zł`;
}

/** Сумма позиций. Отдельная функция, чтобы её можно было накрыть тестом. */
export function sumLines(lines: Array<{ priceGr: number; quantity: number }>): number {
  return lines.reduce((total, line) => {
    if (!Number.isInteger(line.priceGr)) throw new Error("Цена не в грошах");
    if (!Number.isInteger(line.quantity) || line.quantity < 0) {
      throw new Error(`Некорректное количество: ${line.quantity}`);
    }
    return total + line.priceGr * line.quantity;
  }, 0);
}
