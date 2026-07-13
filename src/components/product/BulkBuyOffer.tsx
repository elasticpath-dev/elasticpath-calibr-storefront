"use client";

import { useTranslations } from "next-intl";
import type { BulkBuyTier } from "@/lib/api/products";

type Props = {
  tiers: BulkBuyTier[];
};

export function BulkBuyOffer({ tiers }: Props) {
  const t = useTranslations("product");

  return (
    <div>
      <p className="uppercase font-bold mb-4 text-lg text-red-700">
        {t("bulkBuyOffer")}
      </p>
      <div className="flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-red-50">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-red-700 sm:pl-6"
                    >
                      {t("qty")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-red-700"
                    >
                      {t("pricePerItem")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {tiers.map((tier) => (
                    <tr key={tier.quantityRange}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-800 sm:pl-6">
                        {tier.quantityRange}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-800">
                        {tier.priceFormatted}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
