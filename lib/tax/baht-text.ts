const DIGITS = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];

function readGroup(value: number): string {
  const text = String(value).padStart(6, "0");
  const places = ["แสน", "หมื่น", "พัน", "ร้อย", "สิบ", ""];
  let out = "";
  for (let index = 0; index < 6; index += 1) {
    const digit = Number(text[index]);
    if (digit === 0) continue;
    const place = 5 - index;
    if (place === 1) {
      if (digit === 1) out += "สิบ";
      else if (digit === 2) out += "ยี่สิบ";
      else out += `${DIGITS[digit]}สิบ`;
    } else if (place === 0) {
      out += DIGITS[digit];
    } else {
      out += `${DIGITS[digit]}${places[index]}`;
    }
  }
  return out;
}

export function readThaiInteger(value: number): string {
  if (value === 0) return "ศูนย์";
  if (value < 0) return `ลบ${readThaiInteger(-value)}`;
  const groups: number[] = [];
  let rest = value;
  while (rest > 0) {
    groups.push(rest % 1_000_000);
    rest = Math.floor(rest / 1_000_000);
  }
  let out = "";
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    if (groups[index] === 0) continue;
    out += readGroup(groups[index]);
    if (index > 0) out += "ล้าน";
  }
  if (value % 10 === 1 && value !== 1) out = out.replace(/หนึ่ง$/, "เอ็ด");
  return out;
}

export function bahtText(satang: number): string {
  const sign = satang < 0 ? "ลบ" : "";
  const absolute = Math.abs(satang);
  const baht = Math.floor(absolute / 100);
  const fraction = absolute % 100;
  if (absolute === 0) return "ศูนย์บาทถ้วน";
  const bahtPart = baht === 0 ? "" : `${readThaiInteger(baht)}บาท`;
  const satangPart = fraction === 0 ? "ถ้วน" : `${readThaiInteger(fraction)}สตางค์`;
  return `${sign}${bahtPart}${satangPart}`;
}

const EN_BELOW_20 = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function readEnglishBelow1000(value: number): string {
  if (value < 20) return EN_BELOW_20[value];
  if (value < 100) {
    const ten = Math.floor(value / 10);
    const unit = value % 10;
    return unit === 0 ? EN_TENS[ten] : `${EN_TENS[ten]}-${EN_BELOW_20[unit]}`;
  }
  const hundred = Math.floor(value / 100);
  const rest = value % 100;
  return rest === 0
    ? `${EN_BELOW_20[hundred]} hundred`
    : `${EN_BELOW_20[hundred]} hundred ${readEnglishBelow1000(rest)}`;
}

export function readEnglishInteger(value: number): string {
  if (value === 0) return "zero";
  if (value < 0) return `minus ${readEnglishInteger(-value)}`;
  const scales = ["", "thousand", "million", "billion"];
  const parts: string[] = [];
  let rest = value;
  let scale = 0;
  while (rest > 0) {
    const chunk = rest % 1000;
    if (chunk !== 0) {
      const words = readEnglishBelow1000(chunk);
      parts.unshift(scale === 0 ? words : `${words} ${scales[scale]}`);
    }
    rest = Math.floor(rest / 1000);
    scale += 1;
  }
  return parts.join(" ");
}

export function bahtTextEn(satang: number): string {
  const absolute = Math.abs(satang);
  const baht = Math.floor(absolute / 100);
  const fraction = absolute % 100;
  const sign = satang < 0 ? "minus " : "";
  if (fraction === 0) return `${sign}${readEnglishInteger(baht)} baht exactly`;
  return `${sign}${readEnglishInteger(baht)} baht and ${readEnglishInteger(fraction)} satang`;
}
