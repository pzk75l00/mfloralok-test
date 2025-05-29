import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import StatsCard from './StatsCard';
import PurchasesForm from './PurchasesForm';

export const PurchasesView = ({ plants }) => {
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'purchases'), (snapshot) => {
            const purchasesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPurchases(purchasesData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleCompletePurchase = async (purchaseData) => {
        try {
            await addDoc(collection(db, 'purchases'), purchaseData);
        } catch (error) {
            console.error("Error adding purchase: ", error);
        }
    };

    // Calcular totales por método de pago
    const totalPurchases = purchases.length;
    const totalCash = purchases.filter(p => p.paymentMethod === 'efectivo')
        .reduce((sum, purchase) => sum + (purchase.purchasePrice * purchase.quantity), 0);
    const totalMP = purchases.filter(p => p.paymentMethod === 'mercadoPago')
        .reduce((sum, purchase) => sum + (purchase.purchasePrice * purchase.quantity), 0);

    if (loading) return <div>Cargando compras...</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Compras</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatsCard title="Compras Totales" value={totalPurchases} icon="📊" color="blue" />
                <StatsCard title="Efectivo (E)" value={`$${totalCash.toFixed(2)}`} icon="💵" color="green" />
                <StatsCard title="Mercado Pago (MP)" value={`$${totalMP.toFixed(2)}`} icon="📱" color="purple" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <PurchasesForm plants={plants} onCompletePurchase={handleCompletePurchase} />
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium mb-4">Histórico de Compras</h3>
                    {purchases.length > 0 ? (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {purchases
                                .slice()
                                .sort((a, b) => new Date(b.date) - new Date(a.date))
                                .map((purchase) => (
                                    <div key={purchase.id} className="border-b pb-2 last:border-b-0">
                                        <div className="flex justify-between">
                                            <p className="font-medium">{plants.find(p => p.id === purchase.plantId)?.name || 'Planta eliminada'}</p>
                                            <span className={`px-2 py-1 text-xs rounded-full ${purchase.paymentMethod === 'efectivo' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}>
                                                {purchase.paymentMethod === 'efectivo' ? 'E' : 'MP'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600">{purchase.quantity} x ${purchase.purchasePrice} = ${(purchase.quantity * purchase.purchasePrice).toFixed(2)}</p>
                                        <p className="text-xs text-gray-500">
                                            Fecha: {purchase.date ? new Date(purchase.date).toLocaleString() : '-'}
                                            {purchase.location ? ` | Lugar: ${purchase.location}` : ''}
                                        </p>
                                    </div>
                                ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">No hay compras registradas</p>
                    )}
                </div>
            </div>
        </div>
    );
};