import { describe, expect, it } from 'vitest';
import { daysUntil, expiryState, matchesProduct, sortByExpiry } from './domain.js';

const today = new Date(2026, 7, 12);

describe('caducidades', () => {
  it('calcula días sin depender de la hora', () => {
    expect(daysUntil('2026-08-13', new Date(2026, 7, 12, 23, 55))).toBe(1);
  });

  it('clasifica estados clave', () => {
    expect(expiryState('2026-08-11', today).key).toBe('expired');
    expect(expiryState('2026-08-12', today).key).toBe('today');
    expect(expiryState('2026-08-17', today).key).toBe('urgent');
    expect(expiryState('2026-09-01', today).key).toBe('soon');
    expect(expiryState('2027-01-01', today).key).toBe('safe');
  });

  it('ordena por fecha y busca por nombre o categoría', () => {
    const products = [
      { name: 'Crema', category: 'Alimentos', expiryDate: '2026-09-01', notes: '' },
      { name: 'Paracetamol', category: 'Medicamentos', expiryDate: '2026-08-20', notes: '' }
    ];
    expect(sortByExpiry(products)[0].name).toBe('Paracetamol');
    expect(matchesProduct(products[1], 'medic', 'all', today)).toBe(true);
  });
});
