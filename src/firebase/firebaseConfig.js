import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDd0MHG0qZlUu4GPC8UHA5XhDMGVw__1dc",
    authDomain: "mfloralok.firebaseapp.com",
    databaseURL: "https://mfloralok-default-rtdb.firebaseio.com",
    projectId: "mfloralok",
    storageBucket: "mfloralok.firebasestorage.app",
    messagingSenderId: "426630649514",
    appId: "1:426630649514:web:fa3839e750d4b5230fa2d3",
    measurementId: "G-P9S4FP71WH"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };


3. UPDATE FILE: /components/SalesView.js

import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig'; // Asegúrate de que la ruta es correcta
import StatsCard from './StatsCard';
import SalesForm from './SalesForm';

const SalesView = ({ plants }) => {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'sales'), (snapshot) => {
            const salesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setSales(salesData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleCompleteSale = async(saleData) => {
        try {
            await addDoc(collection(db, 'sales'), saleData);
        } catch (error) {
            console.error("Error adding sale: ", error);
        }
    };

    if (loading) return <div className = "text-center py-10" > Cargando ventas... < /div>;

    return ( <
        div className = "space-y-6" >
        <
        h2 className = "text-2xl font-bold text-gray-800" > Ventas < /h2>

        { /* Resto del componente */ } <
        /div>
    );
};

export default SalesView;


INSTRUCCIONES IMPORTANTES:
    1. Crea una carpeta `firebase`
en el directorio raíz
2. Dentro de ella, crea el archivo `firebaseConfig.js`
como se muestra arriba
3. Reemplaza los valores de configuración con tus credenciales reales de Firebase
4. Asegúrate de que todas las rutas de importación sean correctas

Para que este código funcione completamente, necesitarás:
    1. Crear un proyecto en Firebase Console
2. Configurar una base de datos Firestore
3. Habilitar las reglas de seguridad(puedes comenzar en modo de prueba)
4. Copiar tus credenciales de Firebase al archivo de configuración

¿ Necesitas ayuda adicional con cualquiera de estos pasos ? ¿O prefieres que implementemos una solución temporal con localStorage mientras configuras Firebase ?

    // DONE