import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PaisesManager from '../components/Catalogs/PaisesManager';

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

describe('PaisesManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('crea un país con id numérico', async () => {
    const items = [{ id: 1, nombre: 'Argentina' }];
    render(<PaisesManager items={items} onClose={() => {}} />);
    // Simular ingreso de nombre
    const input = screen.getByPlaceholderText(/nombre de país/i);
    fireEvent.change(input, { target: { value: 'Uruguay' } });
    // Simular click en Agregar
    const button = screen.getByRole('button', { name: /agregar/i });
    fireEvent.click(button);
    await waitFor(() => {
      const firestore = require('firebase/firestore');
      // Permitir propiedades adicionales en el objeto
      expect(firestore.addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: expect.any(Number), nombre: 'Uruguay' })
      );
    });
  });

  it('actualiza un país con id numérico', async () => {
    // Simular que ya existe un país en la lista
    render(<PaisesManager items={[{ id: 5, nombre: 'Chile', activo: true }]} onClose={() => {}} />);
    // Esperar a que el país aparezca en la UI
    const item = await screen.findByText('Chile');
    fireEvent.click(item);
    // Simular cambio de nombre
    const input = screen.getByDisplayValue('Chile');
    fireEvent.change(input, { target: { value: 'Chile Editado' } });
    // Simular click en Agregar/Guardar
    const button = screen.getByRole('button', { name: /agregar|guardar/i });
    fireEvent.click(button);
    await waitFor(() => {
      const firestore = require('firebase/firestore');
      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: 5, nombre: 'Chile Editado' })
      );
    });
  });
});
