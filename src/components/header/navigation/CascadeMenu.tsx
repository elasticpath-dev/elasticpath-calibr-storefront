"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { NavItem, NavTreeNode } from "./types";

type CascadeMenuProps = {
  item: NavItem;
  lang: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  /** Called when a link inside the panel is clicked so the panel closes immediately. */
  onNavigate: () => void;
};

/**
 * Drill-down ("miller columns") dropdown: the open top item's children
 * render as the first column; clicking a child that has children opens
 * them in a new column to its right, and so on. Same panel shell and
 * positioning as MegaMenuPanel (absolute top-full under the sticky header).
 */
export function CascadeMenu({
  item,
  lang,
  onMouseEnter,
  onMouseLeave,
  onNavigate,
}: CascadeMenuProps) {
  const t = useTranslations("nav");
  // One expanded key per drilled level; path[0] selects within
  // item.children, path[1] within that child's children, etc.
  const [path, setPath] = useState<string[]>([]);

  // Reset the drill state whenever a different top item opens.
  useEffect(() => {
    setPath([]);
  }, [item.key]);

  if (!item.children?.length) return null;

  // Column 0 is always the top item's children; each selected node with
  // children contributes the next column.
  const columns: Array<{ parent: NavItem | NavTreeNode; nodes: NavTreeNode[] }> = [
    { parent: item, nodes: item.children },
  ];
  let currentNodes: NavTreeNode[] = item.children;
  for (const selectedKey of path) {
    const selected = currentNodes.find((n) => n.key === selectedKey);
    if (!selected?.children?.length) break;
    columns.push({ parent: selected, nodes: selected.children });
    currentNodes = selected.children;
  }

  const selectAt = (level: number, node: NavTreeNode) => {
    setPath((prev) => [...prev.slice(0, level), node.key]);
  };

  return (
    <div
      role="menu"
      aria-label={`${item.label} menu`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="bg-white border-t border-gray-100 shadow-xl animate-fade-in"
    >
      <div className="container-shell px-8">
        {/* Depth is unbounded (drill as deep as the catalog goes) — the
            column row scrolls horizontally when it outgrows the shell. */}
        <div className="flex overflow-x-auto">
          {columns.map(({ parent, nodes }, level) => (
            <div
              key={`${parent.key}-${level}`}
              className="w-64 flex-none max-h-[70vh] overflow-y-auto border-r border-gray-100 py-3"
            >
              <Link
                href={`/${lang}${parent.href}`}
                role="menuitem"
                onClick={onNavigate}
                className="block px-4 py-2 text-xs font-medium text-brand-secondary hover:underline underline-offset-2"
              >
                {t("viewAll", { label: parent.label })}
              </Link>

              <ul>
                {nodes.map((node) => {
                  const hasChildren = !!node.children?.length;
                  const isSelected = path[level] === node.key;

                  return (
                    <li key={node.key}>
                      {hasChildren ? (
                        <button
                          type="button"
                          role="menuitem"
                          aria-expanded={isSelected}
                          onClick={() => selectAt(level, node)}
                          className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-sm text-left transition-colors
                            ${isSelected
                              ? "bg-gray-50 text-gray-900 font-medium"
                              : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                            }`}
                        >
                          <span className="truncate">{node.label}</span>
                          <ChevronRight
                            size={14}
                            className={`flex-none ${isSelected ? "text-gray-900" : "text-gray-400"}`}
                          />
                        </button>
                      ) : (
                        <Link
                          href={`/${lang}${node.href}`}
                          role="menuitem"
                          onClick={onNavigate}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors truncate"
                        >
                          {node.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
