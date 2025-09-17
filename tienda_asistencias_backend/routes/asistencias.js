const express = require("express");
const pool = require("../config/db");
const { verifyToken, isAdmin, isEmpleado } = require("../middleware/auth");

const router = express.Router();

// Registrar entrada de empleado
router.post("/entrada", verifyToken, isEmpleado, async (req, res) => {
  try {
    console.log("POST /asistencias/entrada - Empleado:", req.user);
    
    // Verificar si ya tiene una entrada sin salida
    const [existing] = await pool.query(
      "SELECT id_asistencia FROM Asistencia WHERE id_empleado = ? AND fecha = CURDATE() AND hora_salida IS NULL",
      [req.user.id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "Ya tienes una entrada registrada sin salida" });
    }

    const [result] = await pool.query(
      "INSERT INTO Asistencia (fecha, hora_entrada, id_empleado, registrado_por) VALUES (CURDATE(), CURTIME(), ?, ?)",
      [req.user.id, req.user.id]
    );
    
    console.log("Entrada registrada con ID:", result.insertId);
    
    res.json({ 
      message: "Entrada registrada", 
      id: result.insertId,
      tipo: "entrada",
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toTimeString().split(' ')[0]
    });
  } catch (error) {
    console.error("Error al registrar entrada:", error);
    res.status(500).json({ message: error.message });
  }
});

// Registrar salida de empleado
router.post("/salida", verifyToken, isEmpleado, async (req, res) => {
  try {
    console.log("POST /asistencias/salida - Empleado:", req.user);
    
    // Buscar la entrada del día actual sin salida
    const [entrada] = await pool.query(
      "SELECT id_asistencia FROM Asistencia WHERE id_empleado = ? AND fecha = CURDATE() AND hora_salida IS NULL",
      [req.user.id]
    );

    if (entrada.length === 0) {
      return res.status(400).json({ message: "No tienes una entrada registrada para hoy" });
    }

    await pool.query(
      "UPDATE Asistencia SET hora_salida = CURTIME() WHERE id_asistencia = ?",
      [entrada[0].id_asistencia]
    );
    
    console.log("Salida registrada para asistencia ID:", entrada[0].id_asistencia);
    
    res.json({ 
      message: "Salida registrada",
      tipo: "salida",
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toTimeString().split(' ')[0]
    });
  } catch (error) {
    console.error("Error al registrar salida:", error);
    res.status(500).json({ message: error.message });
  }
});

// Listar asistencias de una tienda (solo admin)
router.get("/tienda/:id", verifyToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    console.log("GET /asistencias/tienda/:id - Admin:", req.user);
    
    const [rows] = await pool.query(
      `SELECT A.id_asistencia as id, E.nombre, A.fecha, A.hora_entrada, A.hora_salida
       FROM Asistencia A 
       JOIN Empleado E ON A.id_empleado = E.id_empleado 
       WHERE E.id_tienda = ?
       ORDER BY A.fecha DESC, A.hora_entrada DESC`,
      [id]
    );
    
    console.log("Asistencias encontradas:", rows.length);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener asistencias:", error);
    res.status(500).json({ message: error.message });
  }
});

// Obtener asistencias del empleado actual
router.get("/mis-asistencias", verifyToken, isEmpleado, async (req, res) => {
  try {
    console.log("GET /asistencias/mis-asistencias - Empleado:", req.user);
    
    const [rows] = await pool.query(
      `SELECT id_asistencia as id, fecha, hora_entrada, hora_salida 
       FROM Asistencia 
       WHERE id_empleado = ?
       ORDER BY fecha DESC, hora_entrada DESC
       LIMIT 50`,
      [req.user.id]
    );
    
    console.log("Mis asistencias encontradas:", rows.length);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener mis asistencias:", error);
    res.status(500).json({ message: error.message });
  }
});

// Admin puede registrar asistencia por QR
router.post("/qr", verifyToken, isAdmin, async (req, res) => {
  const { id_empleado, tipo } = req.body; // tipo: "entrada" o "salida"
  
  if (!id_empleado || !tipo) {
    return res.status(400).json({ message: "ID de empleado y tipo son obligatorios" });
  }
  
  try {
    console.log("POST /asistencias/qr - Admin registra:", { id_empleado, tipo });
    
    if (tipo === "entrada") {
      // Verificar si ya tiene entrada
      const [existing] = await pool.query(
        "SELECT id_asistencia FROM Asistencia WHERE id_empleado = ? AND fecha = CURDATE() AND hora_salida IS NULL",
        [id_empleado]
      );

      if (existing.length > 0) {
        return res.status(400).json({ message: "El empleado ya tiene una entrada registrada" });
      }

      const [result] = await pool.query(
        "INSERT INTO Asistencia (fecha, hora_entrada, id_empleado, registrado_por) VALUES (CURDATE(), CURTIME(), ?, ?)",
        [id_empleado, req.user.id]
      );
      
      res.json({ message: "Entrada registrada por QR", id: result.insertId });
      
    } else if (tipo === "salida") {
      // Buscar entrada sin salida
      const [entrada] = await pool.query(
        "SELECT id_asistencia FROM Asistencia WHERE id_empleado = ? AND fecha = CURDATE() AND hora_salida IS NULL",
        [id_empleado]
      );

      if (entrada.length === 0) {
        return res.status(400).json({ message: "El empleado no tiene entrada registrada para hoy" });
      }

      await pool.query(
        "UPDATE Asistencia SET hora_salida = CURTIME() WHERE id_asistencia = ?",
        [entrada[0].id_asistencia]
      );
      
      res.json({ message: "Salida registrada por QR" });
    } else {
      return res.status(400).json({ message: "Tipo debe ser 'entrada' o 'salida'" });
    }
    
  } catch (error) {
    console.error("Error al registrar asistencia por QR:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;