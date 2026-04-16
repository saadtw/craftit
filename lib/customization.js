export const CUSTOMIZATION_TYPE_OPTIONS = [
  {
    id: "branding",
    label: "Branding",
    description: "Brand logo, brand marks, and brand identity changes",
  },
  {
    id: "logo_placement",
    label: "Logo Placement",
    description: "Placement, size, and print method for logos",
  },
  {
    id: "color",
    label: "Color",
    description: "Color variants and custom color palettes",
  },
  {
    id: "material",
    label: "Material",
    description: "Alternative material choices",
  },
  {
    id: "packaging",
    label: "Packaging",
    description: "Custom packaging and labels",
  },
  {
    id: "dimensions",
    label: "Dimensions",
    description: "Dimensional or sizing adjustments",
  },
  {
    id: "engraving",
    label: "Engraving",
    description: "Engraved text, serials, or markings",
  },
  {
    id: "finishing",
    label: "Finishing",
    description: "Surface finish or coating changes",
  },
  {
    id: "accessories",
    label: "Accessories",
    description: "Accessory bundle additions or removals",
  },
  {
    id: "other",
    label: "Other",
    description: "Other controlled customization options",
  },
];

export const CUSTOMIZATION_TYPE_IDS = CUSTOMIZATION_TYPE_OPTIONS.map(
  (option) => option.id,
);

export function normalizeCustomizationTypes(types) {
  if (!Array.isArray(types)) {
    return [];
  }

  const normalized = types
    .map((type) =>
      String(type || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_"),
    )
    .filter((type) => CUSTOMIZATION_TYPE_IDS.includes(type));

  return [...new Set(normalized)];
}
