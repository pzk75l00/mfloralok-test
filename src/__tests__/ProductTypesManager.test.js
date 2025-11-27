import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProductTypesManager from '../components/Inventory/ProductTypesManager';

jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  onSnapshot: jest.fn(() => () => {}),
  query: jest.fn((...args) => args[0]),
  orderBy: jest.fn(() => {}),
}));

jest.mock('../firebase/firebaseConfig', () => ({
  __esModule: true,
  default: {},
}));

describe('ProductTypesManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('crea un tipo de producto con id numérico', async () => {
    render(<ProductTypesManager onClose={() => {}} isOpen={true} />);
    // Aquí deberías simular la edición real si la UI lo permite
    await waitFor(() => {
      const firestore = require('firebase/firestore');
      expect(firestore.addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: expect.any(Number) })
      );
    });
  });

  it('actualiza un tipo de producto con id numérico', async () => {
    render(<ProductTypesManager onClose={() => {}} isOpen={true} />);
    // Aquí deberías simular la edición real si la UI lo permite
    await waitFor(() => {
      const firestore = require('firebase/firestore');
      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: expect.any(Number) })
      );
    });
  });
});
