import { isPaid, priceInCurrency, type Currency, type Product } from '../context/StoreContext';

export type StoreOrderLine = {
  productId: string;
  title: string;
  amount: number | null;
};

export type PaidStoreOrderLine = StoreOrderLine & { amount: number };

export function storeOrderLines(products: readonly Product[], currency: Currency): StoreOrderLine[] {
  return products.map((product) => ({
    productId: product.id,
    title: product.title,
    amount: isPaid(product) ? priceInCurrency(product, currency) : null,
  }));
}

export function isPaidLine(line: StoreOrderLine): line is PaidStoreOrderLine {
  return line.amount !== null;
}

export function storeOrderTotal(lines: readonly StoreOrderLine[]): number {
  return lines.filter(isPaidLine).reduce((sum, line) => sum + line.amount, 0);
}
