export const bankDetails = {
  bankName: process.env.NEXT_PUBLIC_BANK_NAME ?? "Lumina Global Bank",
  accountHolder:
    process.env.NEXT_PUBLIC_BANK_ACCOUNT_HOLDER ?? "XSEL Learning Systems",
  accountNumber:
    process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER ?? "8829 1044 2003",
  iban: process.env.NEXT_PUBLIC_BANK_IBAN ?? "GB02 LUMA 8829 1044 2003",
};

export const easyPaisaDetails = {
  accountName:
    process.env.NEXT_PUBLIC_EASYPAISA_ACCOUNT_NAME ?? "XSEL Learning Systems",
  accountNumber:
    process.env.NEXT_PUBLIC_EASYPAISA_ACCOUNT_NUMBER ?? "0300 1234567",
};

export const jazzCashDetails = {
  accountName:
    process.env.NEXT_PUBLIC_JAZZCASH_ACCOUNT_NAME ?? "XSEL Learning Systems",
  accountNumber:
    process.env.NEXT_PUBLIC_JAZZCASH_ACCOUNT_NUMBER ?? "0300 7654321",
};

export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
export const RECEIPT_ACCEPT = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "application/pdf": [".pdf"],
} as const;
