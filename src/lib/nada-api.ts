const BASE_URL =
  "https://iig-cus-ccd-prd-wa-car-valuation-api.azurewebsites.net";

function getApiKey(): string | null {
  return process.env.NADA_VALUATION_API_KEY?.trim() || null;
}

async function nadaFetch<T>(path: string): Promise<T> {
  const key = getApiKey();
  if (!key) throw new Error("NADA_VALUATION_API_KEY is not configured.");

  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { authentication_key: key },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`NADA API ${res.status} for ${path}: ${text.slice(0, 300)}`);
  }

  return res.json() as Promise<T>;
}

export type NadaMake = {
  companynum: number;
  company: string;
};

export type NadaModel = {
  modelcat: string;
  basemodel: string;
};

export type NadaTrim = {
  model: string;
  basebody?: string;
  basedoor?: string;
};

/**
 * Get all makes for a given year.
 * NADA returns an array of company objects.
 */
export async function getMakesByYear(year: number): Promise<NadaMake[]> {
  const raw = await nadaFetch<unknown>(
    `/api/nada_raw_companies/makes/${year}`,
  );
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((r: Record<string, unknown>) => ({
    companynum: Number.parseInt(String(r.companynum ?? r.CompanyNum ?? r.company_num ?? "0"), 10),
    company: String(
      r.company ?? r.Company ?? r.companyname ?? r.CompanyName ?? r.company_name ?? "",
    ),
  })).filter((m) => m.companynum > 0 && m.company.length > 0);
}

/**
 * Get all models for a make (companynum) + year.
 */
export async function getModelsByMakeYear(
  companynum: number,
  year: number,
): Promise<NadaModel[]> {
  const raw = await nadaFetch<unknown>(
    `/api/standard_table/${companynum}/${year}`,
  );
  const arr = Array.isArray(raw) ? raw : [];

  const seen = new Set<string>();
  const models: NadaModel[] = [];
  for (const r of arr as Record<string, unknown>[]) {
    const cat = String(r.modelcat ?? r.ModelCat ?? r.model_cat ?? "");
    if (!cat || seen.has(cat)) continue;
    seen.add(cat);
    models.push({
      modelcat: cat,
      basemodel: String(r.basemodel ?? r.BaseModel ?? r.base_model ?? ""),
    });
  }
  return models;
}

/**
 * Get trims for a make + year + model category.
 */
export async function getTrimsByModel(
  companynum: number,
  year: number,
  modelcat: string,
): Promise<NadaTrim[]> {
  const raw = await nadaFetch<unknown>(
    `/api/standard_table/${companynum}/${year}/${encodeURIComponent(modelcat)}`,
  );
  const arr = Array.isArray(raw) ? raw : [];

  const seen = new Set<string>();
  const trims: NadaTrim[] = [];
  for (const r of arr as Record<string, unknown>[]) {
    const m = String(r.model ?? "");
    if (!m || seen.has(m)) continue;
    seen.add(m);
    trims.push({
      model: m,
      basebody: r.basebody ? String(r.basebody) : undefined,
      basedoor: r.basedoor ? String(r.basedoor) : undefined,
    });
  }
  return trims;
}

export function isNadaConfigured(): boolean {
  return !!getApiKey();
}
