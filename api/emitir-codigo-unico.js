const { v4: uuidv4 } = require("uuid");
const { Pool } = require("pg");

const connectionString =
  process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL no está definida en las variables de entorno de Vercel");
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false } // seguro con ?sslmode=require, pero esto ayuda por si acaso
});

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { email, variante } = req.body;
  if (!email || !variante) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  try {
    const result = await pool.query(
      "SELECT codigo_texto FROM ab_first_purchase_coupons WHERE email = $1",
      [email]
    );
    if (result.rows.length > 0) {
      return res.status(200).json({ code: result.rows[0].codigo_texto });
    }

    const codigo = `PREVI-${uuidv4().split("-")[0]}`;
    await pool.query(
      `INSERT INTO ab_first_purchase_coupons (email, variante, codigo_texto)
       VALUES ($1, $2, $3)`,
      [email, variante, codigo]
    );

    return res.status(201).json({ code: codigo });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error interno" });
  }
};
