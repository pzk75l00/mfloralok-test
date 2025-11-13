import React, { useState } from 'react';
import { db } from '../firebase/firebaseConfig';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

export default function SignupForm() {
  const [form, setForm] = useState({
    comercio: '',
    responsableEmail: '',
    telefono: '',
    rubroId: 'floreria'
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      await addDoc(collection(db, 'signups'), {
        ...form,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setMsg('Solicitud enviada. Te contactaremos a la brevedad.');
      setForm({ comercio: '', responsableEmail: '', telefono: '', rubroId: 'floreria' });
    } catch (e) {
      setMsg('No pudimos enviar la solicitud. Intentá nuevamente.');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={onSubmit} className="bg-white p-4 rounded shadow max-w-md mx-auto mt-4 border border-gray-200">
      <h3 className="text-lg font-bold mb-2">Solicitud de alta</h3>
      <div className="mb-2">
        <label className="block text-xs font-semibold">Comercio</label>
        <input name="comercio" value={form.comercio} onChange={onChange} className="border rounded p-2 w-full text-sm" required />
      </div>
      <div className="mb-2">
        <label className="block text-xs font-semibold">Email responsable</label>
        <input name="responsableEmail" type="email" value={form.responsableEmail} onChange={onChange} className="border rounded p-2 w-full text-sm" required />
      </div>
      <div className="mb-2">
        <label className="block text-xs font-semibold">Teléfono</label>
        <input name="telefono" value={form.telefono} onChange={onChange} className="border rounded p-2 w-full text-sm" required />
      </div>
      <div className="mb-2">
        <label className="block text-xs font-semibold">Rubro</label>
        <select name="rubroId" value={form.rubroId} onChange={onChange} className="border rounded p-2 w-full text-sm">
          <option value="floreria">Florería</option>
          <option value="vivero">Vivero</option>
          <option value="jardineria">Jardinería</option>
        </select>
      </div>
      {msg && <div className="text-xs text-gray-700 mb-2">{msg}</div>}
      <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded font-semibold" disabled={loading}>
        {loading ? 'Enviando…' : 'Enviar solicitud'}
      </button>
    </form>
  );
}
