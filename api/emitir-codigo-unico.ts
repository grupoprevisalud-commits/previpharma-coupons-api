import type { VercelRequest, VercelResponse } from "@vercel/node";
import pool from "../lib/db";
import { randomUUID } from "crypto";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { email, variante } = req.body;

  if (!email || !variante) {
    return res.status(400).json({ error: "Faltan parámetros: email o variante" });
  }

  try {
    const client = await pool.connect();

    // Verificar si ya existe un cupón para ese correo
    const result = await client.query(
      "SELECT * FROM ab_first_purchase_coupons WHERE email = $1",
      [email]
    );

    if (result.rows.length > 0) {
      client.release();
      return res.status(200).json({
        message: "Ya tienes un código asignado",
        codigo: result.rows[0].codigo,
      });
    }

    // Crear un nuevo código
    const codigo = "PREVI-" + randomUUID().split("-")[0].toUpperCase();

    await client.query(
      `INSERT INTO ab_first_purchase_coupons (email, variante, codigo, issue_at)
       VALUES ($1, $2, $3, NOW())`,
      [email, variante, codigo]
    );

    client.release();

    return res.status(201).json({ message: "Código creado", codigo });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

