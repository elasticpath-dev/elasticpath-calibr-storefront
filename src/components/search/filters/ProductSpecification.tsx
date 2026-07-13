"use client";

import { FilterCheckbox } from "./FilterCheckbox";
import { FilterRadio } from "./FilterRadio";

type FilterItem = {
  attribute: string;
  name: string;
  type: "checkbox" | "radio" | "slider";
};

function parseFilterItems(raw: string): FilterItem[] {
  if (!raw.trim()) return [];
  return raw
    .split(",")
    .map((entry) => {
      const parts = entry.trim().split("|");
      if (parts.length < 2) return null;
      const [attribute, name, type = "checkbox"] = parts;
      if (!attribute || !name) return null;
      return {
        attribute: attribute.trim(),
        name: name.trim(),
        type: type.trim() as FilterItem["type"],
      };
    })
    .filter((item): item is FilterItem => item !== null);
}

export function ProductSpecification({
  filterItems = "",
}: {
  filterItems?: string;
}) {
  const items = parseFilterItems(filterItems);
  if (!items.length) return null;

  return (
    <>
      {items.map((item) => {
        if (item.type === "radio") {
          return (
            <FilterRadio
              key={item.attribute}
              attribute={item.attribute}
              name={item.name}
            />
          );
        }
        return (
          <FilterCheckbox
            key={item.attribute}
            attribute={item.attribute}
            name={item.name}
          />
        );
      })}
    </>
  );
}
