import { describe, expect, it } from 'vitest';
import { STORE_PRODUCTS } from '../context/StoreContext';
import { isPaidLine, storeOrderLines, storeOrderTotal } from './storeOrder';

const paidPlan = STORE_PRODUCTS.find((product) => product.id === 'fat-loss-30')!;
const freeEbook = STORE_PRODUCTS.find((product) => product.id === 'hormone-harmony-ebook')!;
const secondPaidPlan = STORE_PRODUCTS.find((product) => product.id === 'bigger-glutes-30')!;

describe('store order lines', () => {
  it('prices paid products in the chosen currency and keeps free ones at no amount', () => {
    // arrange
    const products = [paidPlan, freeEbook];

    // act
    const lines = storeOrderLines(products, 'USD');

    // assert
    expect(lines).toEqual([
      { productId: 'fat-loss-30', title: paidPlan.title, amount: 45 },
      { productId: 'hormone-harmony-ebook', title: freeEbook.title, amount: null },
    ]);
  });

  it('totals only the paid lines', () => {
    // arrange
    const lines = storeOrderLines([paidPlan, freeEbook, secondPaidPlan], 'EUR');

    // act
    const total = storeOrderTotal(lines);

    // assert
    expect(total).toBe(88);
    expect(lines.filter(isPaidLine).map((line) => line.productId)).toEqual([
      'fat-loss-30',
      'bigger-glutes-30',
    ]);
  });
});
