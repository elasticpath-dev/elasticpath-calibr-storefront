import { MapPin } from "lucide-react";
import { COUNTRIES } from "@/lib/countries";

export type DeliveryAddressData = {
  first_name?: string;
  last_name?: string;
  company_name?: string;
  line_1?: string;
  line_2?: string;
  city?: string;
  postcode?: string;
  county?: string;
  country?: string;
};

type Props = {
  address: DeliveryAddressData;
  className?: string;
};

export function DeliveryAddress({ address, className }: Props) {
  const name = [address.first_name, address.last_name].filter(Boolean).join(" ");
  const street = [address.line_1, address.line_2].filter(Boolean).join(", ");
  const countryName = address.country
    ? (COUNTRIES.find((c) => c.code === address.country)?.label ?? address.country)
    : undefined;
  const region = [address.city, address.postcode, address.county, countryName]
    .filter(Boolean)
    .join(", ");

  if (!name && !street) return null;

  return (
    <div className={`flex items-start gap-2 ${className ?? ""}`}>
      <MapPin size={14} className="flex-shrink-0 mt-0.5 text-gray-400" />
      <div>
        {name && <p className="text-sm font-semibold text-gray-900 leading-snug">{name}</p>}
        {address.company_name && (
          <p className="text-sm text-gray-500 leading-snug">{address.company_name}</p>
        )}
        {street && <p className="text-sm text-gray-600 leading-snug">{street}</p>}
        {region && <p className="text-sm text-gray-500 leading-snug">{region}</p>}
      </div>
    </div>
  );
}
