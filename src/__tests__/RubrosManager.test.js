import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RubrosManager from '../components/Catalogs/RubrosManager';

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

describe('RubrosManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('crea un rubro con id numérico', async () => {
    const rubros = [{ id: 1, nombre: 'Rubro1' }, { id: 2, nombre: 'Rubro2' }];
    render(<RubrosManager rubros={rubros} onClose={() => {}} />);
    // Simular ingreso de nombre
    const input = screen.getByPlaceholderText(/nuevo rubro/i);
    fireEvent.change(input, { target: { value: 'Nuevo Rubro' } });
    // Simular click en Agregar
    const button = screen.getByRole('button', { name: /agregar/i });
    fireEvent.click(button);
    await waitFor(() => {
      const firestore = require('firebase/firestore');
      // Permitir propiedades adicionales en el objeto
      expect(firestore.addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: expect.any(Number), nombre: 'Nuevo Rubro' })
      );
    });
  });

  it('actualiza un rubro con id numérico', async () => {
    // Simular que ya existe un rubro en la lista
    render(<RubrosManager rubros={[{ id: 5, nombre: 'Rubro5', activo: true }]} onClose={() => {}} />);
    // Esperar a que el rubro aparezca en la UI
    const item = await screen.findByText('Rubro5');
    fireEvent.click(item);
    // Simular cambio de nombre
    const input = screen.getByDisplayValue('Rubro5');
    fireEvent.change(input, { target: { value: 'Rubro5 Editado' } });
    // Simular click en Agregar/Guardar
    const button = screen.getByRole('button', { name: /agregar|guardar/i });
    fireEvent.click(button);
    await waitFor(() => {
      const firestore = require('firebase/firestore');
      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: 5, nombre: 'Rubro5 Editado' })
      );
    });
  });
});
