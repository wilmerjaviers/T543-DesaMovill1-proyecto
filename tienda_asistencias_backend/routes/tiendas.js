const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, isSuperAdmin } = require("../middleware/auth");

// Obtener todas las tiendas
router.get("/", verifyToken, async (req, res) => {
  try {
    console.log("GET /tiendas - Usuario:", req.user);
    const [rows] = await pool.query("SELECT id_tienda as id, nombre, direccion, telefono FROM Tienda ORDER BY nombre ASC");
    console.log("Tiendas encontradas:", rows.length);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener tiendas:", error);
    res.status(500).json({ message: error.message });
  }
});

// Obtener tienda por ID
router.get("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query("SELECT * FROM Tienda WHERE id_tienda = ?", [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: "Tienda no encontrada" });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener tienda:", error);
    res.status(500).json({ message: error.message });
  }
});

// Crear tienda (solo superadmin)
router.post("/", verifyToken, isSuperAdmin, async (req, res) => {
  const { nombre, direccion, telefono } = req.body;
  
  if (!nombre || !direccion) {
    return res.status(400).json({ message: "Nombre y dirección son obligatorios" });
  }
  
  try {
    console.log("POST /tiendas - Creando tienda:", { nombre, direccion, telefono });
    
    const [result] = await pool.query(
      "INSERT INTO Tienda (nombre, direccion, telefono) VALUES (?, ?, ?)",
      [nombre.trim(), direccion.trim(), telefono?.trim() || null]
    );
    
    console.log("Tienda creada con ID:", result.insertId);
    
    res.status(201).json({ 
      id: result.insertId, 
      nombre: nombre.trim(), 
      direccion: direccion.trim(), 
      telefono: telefono?.trim() || null 
    });
  } catch (error) {
    console.error("Error al crear tienda:", error);
    res.status(500).json({ message: error.message });
  }
});

// Actualizar tienda (solo superadmin)
router.put("/:id", verifyToken, isSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { nombre, direccion, telefono } = req.body;
  
  if (!nombre || !direccion) {
    return res.status(400).json({ message: "Nombre y dirección son obligatorios" });
  }
  
  try {
    const [existing] = await pool.query("SELECT id_tienda FROM Tienda WHERE id_tienda = ?", [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({ message: "Tienda no encontrada" });
    }
    
    await pool.query(
      "UPDATE Tienda SET nombre = ?, direccion = ?, telefono = ? WHERE id_tienda = ?",
      [nombre.trim(), direccion.trim(), telefono?.trim() || null, id]
    );
    
    res.json({ 
      message: "Tienda actualizada correctamente",
      tienda: {
        id: parseInt(id),
        nombre: nombre.trim(),
        direccion: direccion.trim(), 
        telefono: telefono?.trim() || null
      }
    });
  } catch (error) {
    console.error("Error al actualizar tienda:", error);
    res.status(500).json({ message: error.message });
  }
});

// Eliminar tienda (solo superadmin)
router.delete("/:id", verifyToken, isSuperAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [existing] = await pool.query("SELECT id_tienda, nombre FROM Tienda WHERE id_tienda = ?", [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({ message: "Tienda no encontrada" });
    }
    
    await pool.query("DELETE FROM Tienda WHERE id_tienda = ?", [id]);
    
    res.json({ 
      message: "Tienda eliminada correctamente",
      tienda: existing[0].nombre
    });
  } catch (error) {
    console.error("Error al eliminar tienda:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;