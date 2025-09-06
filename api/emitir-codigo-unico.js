// api/emitir-codigo-unico.js
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');

// Reutiliza el pool en Vercel para evitar demasiadas conexiones
let pool;
if (!global._pgPool) {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL no está definida en las variables de entorno de Vercel');
  }
  global._pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,          // 👈 usa DATABASE_URL
    ssl: { rejectUnauthorized: false }                   // 👈 requiere SSL con Supabase
  });
}
pool = global._pgPool;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Acepta ambas claves por si tu cliente manda "correo_electronico"
  const email = req.body?.email || req.body?.correo_electronico;
  const variante = req.body?.variante;

  if (!email || !variante) {
    return res.status(400).json({ error: 'Faltan datos: email/correo_electronico y variante' });
  }

  try {
    // Normaliza email
    const correo = String(email).trim().toLowerCase();

    // 1) Verificar si ya existe cupón
    const existe = await pool.query(
      `SELECT codigo_texto 
         FROM ab_first_purchase_coupons 
        WHERE email = $1`,
      [correo]
    );

    if (existe.rows.length > 0) {
      return res.status(200).json({ code: existe.rows[0].codigo_texto });
    }

    // 2) Generar código único
    const codigo = `PREVI-${uuidv4().split('-')[0].toUpperCase()}`;

    // 3) Insertar
    await pool.query(
      `INSERT INTO ab_first_purchase_coupons (email, variante, codigo_texto)
       VALUES ($1, $2, $3)`,
      [correo, variante, codigo]
    );

    return res.status(201).json({ code: codigo });
  } catch (error) {
    console.error('Error en /api/emitir-codigo-unico:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
};
