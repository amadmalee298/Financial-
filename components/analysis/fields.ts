/** Numeric fields of stock_analysis, with their input settings. */
export const ANALYSIS_NUMBER_FIELDS = [
  { key: "revenue", label: "รายได้ (ล้านบาท)", scale: 2, allowNegative: false },
  { key: "net_profit", label: "กำไรสุทธิ (ล้านบาท)", scale: 2, allowNegative: true },
  { key: "eps", label: "EPS (บาท)", scale: 4, allowNegative: true },
  { key: "pe", label: "P/E (เท่า)", scale: 4, allowNegative: true },
  { key: "pbv", label: "P/BV (เท่า)", scale: 4, allowNegative: false },
  { key: "roe", label: "ROE (%)", scale: 4, allowNegative: true },
  { key: "roa", label: "ROA (%)", scale: 4, allowNegative: true },
  { key: "debt_equity", label: "D/E (เท่า)", scale: 4, allowNegative: false },
  { key: "dividend_yield", label: "Dividend Yield (%)", scale: 4, allowNegative: false },
  { key: "fair_value", label: "มูลค่าที่เหมาะสม (บาท)", scale: 4, allowNegative: false },
  { key: "target_price", label: "ราคาเป้าหมาย (บาท)", scale: 4, allowNegative: false },
] as const;

export const ANALYSIS_TEXT_FIELDS = [
  { key: "investment_thesis", label: "เหตุผลที่ลงทุน (Investment Thesis)", placeholder: "ทำไมหุ้นนี้น่าลงทุน ธุรกิจเติบโตจากอะไร" },
  { key: "strengths", label: "จุดแข็ง", placeholder: "ความได้เปรียบทางการแข่งขัน แบรนด์ ส่วนแบ่งตลาด" },
  { key: "risks", label: "ความเสี่ยง", placeholder: "สิ่งที่อาจทำให้ thesis ผิด และสัญญาณที่จะทำให้ขาย" },
] as const;

export type AnalysisNumberKey = (typeof ANALYSIS_NUMBER_FIELDS)[number]["key"];
export type AnalysisTextKey = (typeof ANALYSIS_TEXT_FIELDS)[number]["key"];
export type AnalysisFormValues = Record<AnalysisNumberKey | AnalysisTextKey, string>;
