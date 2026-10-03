export const WA_NUMBER = "087825053557";
export const WA_E164 = "6287825053557";
export const WA_LINK = `https://wa.me/${WA_E164}`;
export const BCA_ACCOUNT = "4452309711";
export const BCA_BANK = "BCA";

export type SizeId = "350";
export type SugarId = "100" | "50" | "0";
export type FlavorId = "strawberry" | "coklat" | "matcha" | "murni" | "lainnya";

export type Flavor = {
  id: FlavorId;
  name: string;
  english: string;
  blurb: string;
  pitch: string;
  price250: number;
  price350: number;
  image: string;
  custom?: boolean;
};

export const FLAVORS: Flavor[] = [
  {
    id: "strawberry",
    name: "Strawberry",
    english: "Berry blush",
    blurb: "Susu strawberry creamy dengan rasa buah yang nyatanya ada.",
    pitch: "Pink, creamy, and a little bit flirty. Fresh milk folded with real strawberry.",
    price250: 9000,
    price350: 10000,
    image: "/products/strawberry.jpg",
  },
  {
    id: "coklat",
    name: "Coklat",
    english: "Cocoa silk",
    blurb: "Susu coklat kental, manisnya pas, cocok dingin-dingin.",
    pitch: "Velvet cocoa in cold fresh milk. The one you finish before the straw does.",
    price250: 9000,
    price350: 10000,
    image: "/products/coklat.jpg",
  },
  {
    id: "matcha",
    name: "Matcha",
    english: "Green cream",
    blurb: "Matcha lembut, tidak pahit, nyatu sama susu murni.",
    pitch: "Ceremonial-soft matcha, milky and calm. Green, but make it dessert.",
    price250: 9000,
    price350: 10000,
    image: "/products/matcha.jpg",
  },
  {
    id: "murni",
    name: "Murni",
    english: "Just milk",
    blurb: "Susu murni tanpa campuran. Harga special — yang paling jujur.",
    pitch: "Nothing added. Cold, clean, farm-fresh milk in its Sunday clothes.",
    price250: 7000,
    price350: 7000,
    image: "/products/murni.jpg",
  },
  {
    id: "lainnya",
    name: "Lainnya",
    english: "Custom sip",
    blurb: "Punya request sendiri? Tulis ke CS, kami bikinin.",
    pitch: "Tarik, vanilla, extra coklat, kurang manis — chat aja. CS Moova siap request.",
    price250: 9000,
    price350: 10000,
    image: "/products/lainnya.jpg",
    custom: true,
  },
];

export const SIZES: { id: SizeId; label: string; hint: string }[] = [
  { id: "350", label: "350 ml", hint: "ukuran MŌVA" },
];

export const SUGAR_LEVELS: { id: SugarId; label: string; hint: string }[] = [
  { id: "100", label: "100% Normal", hint: "rasa normal" },
  { id: "50", label: "50% Less Sweet", hint: "lebih ringan" },
  { id: "0", label: "0% No Added Sugar", hint: "tanpa gula tambahan" },
];

export const BCA_HOLDER_MASKED = "MO*** DAF*** FAK***";
export const STORE_ADDRESS = "Jl. Tegalturi, depan Taman Budaya Giwangan, Yogyakarta";
export const STORE_MAPS_LINK = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(STORE_ADDRESS)}`;

export function sugarLabel(id: SugarId) {
  return SUGAR_LEVELS.find((item) => item.id === id)?.label ?? SUGAR_LEVELS[0].label;
}


export function flavorById(id: string): Flavor {
  return FLAVORS.find((item) => item.id === id) ?? FLAVORS[0];
}

export function priceOf(flavor: Flavor, size: SizeId) {
  return size === "350" ? flavor.price350 : flavor.price250;
}

export const REVIEWS = [
  {
    name: "Dina A.",
    flavor: "Strawberry",
    text: "Strawberry-nya berasa buah, bukan cuma wangi. Dingin sampai rumah.",
  },
  {
    name: "Raka P.",
    flavor: "Murni",
    text: "Murni 350 ml buat sarapan — bersih, tidak amis, harga 7 ribu, gila sih.",
  },
  {
    name: "Sari M.",
    flavor: "Matcha",
    text: "Matcha-nya creamy, nggak pahit. Udah repeat order tiga kali minggu ini.",
  },
  {
    name: "Bimo K.",
    flavor: "Lainnya",
    text: "Request coklat lebih pekat lewat WA, CS-nya langsung bikinin. Recommended.",
  },
];
