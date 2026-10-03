export const CONFIG = {
  brand: {
    name: "MŌVA Fresh Milk",
    shortName: "MŌVA",
    tagline: "Fresh Milk, Reimagined.",
    projectCode: "1567",
    businessManagerUrl: "https://7tmtsk6z5d-ui.github.io/M-VA-BUSINESS-MANAGER/",
    storeAddress: "Jl. Tegalturi No. 43, depan Taman Budaya Embung Giwangan, Giwangan, Umbulharjo, Yogyakarta"
  },

  whatsapp: {
    number: "6287825053557",
    display: "0878 2505 3557"
  },

  payment: {
    qris: {
      enabled: true,
      image: "./assets/qris-mova.png",
      label: "QRIS MŌVA Fresh Milk",
      verification: "proof_required"
    },
    bca: {
      enabled: true,
      bank: "BCA",
      accountNumber: "4452309711",
      accountName: "MO*** DAF*** FAK***",
      verification: "proof_required"
    },
    verification: {
      requireProof: true,
      note: "Bukti pembayaran diperiksa secara manual oleh MŌVA sebelum pesanan diproses."
    }
  },

  delivery: {
    currency: "IDR",
    tiers: [
      { maxKm: 5, fee: 0, label: "FREE DELIVERY" },
      { maxKm: 8, fee: 5000, label: "Rp5.000" },
      { maxKm: 12, fee: 10000, label: "Rp10.000" },
      { maxKm: 15, fee: 15000, label: "Rp15.000" }
    ],
    manualConfirmationAboveKm: 15,
    locationMode: "browser_geolocation",
    storeOrigin: {
      // Area reference for Jl. Tegalturi No. 43 / Taman Budaya Embung Giwangan.
      // Keep this centralized so it can be refined later without touching checkout logic.
      lat: -7.8278,
      lng: 110.3998,
      precision: "area_reference"
    }
  },

  pricing: {
    currency: "IDR",
    products: {
      fresh: { name: "Fresh Milk", "350": 7000 }
    },
    flavorPrice: 10000,
    pureFlavorId: "murni"
  },

  production: {
    orderPath: "/"
  }
};
