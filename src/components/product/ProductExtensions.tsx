import type { ProductExtensionGroup } from "@/lib/api/products";

type Props = {
  extensions: ProductExtensionGroup[];
};

export function ProductExtensions({ extensions }: Props) {
  if (!extensions.length) return null;

  return (
    <div className="flex flex-col gap-8">
      {extensions.map((group) => (
        <div key={group.key}>
          <div className="px-4 py-3 bg-ink-50 border border-ink-200 rounded-t-lg">
            <h2 className="text-xs font-bold text-ink-900 uppercase tracking-widest">
              {group.title}
            </h2>
          </div>
          <div className="border border-t-0 border-ink-200 rounded-b-lg overflow-hidden">
            {group.fields.map((field, idx) => (
              <div
                key={field.key}
                className={`flex items-center px-4 py-3${idx < group.fields.length - 1 ? " border-b border-ink-100" : ""}`}
              >
                <span className="w-1/2 text-sm text-ink-500">{field.label}</span>
                <span className="w-1/2 text-sm font-medium text-ink-900">{field.value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
