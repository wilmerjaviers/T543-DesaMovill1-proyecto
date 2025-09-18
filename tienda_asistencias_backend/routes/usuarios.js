const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const { verifyToken, isSuperAdmin, isAdmin } = require("../middleware/auth");

const router = express.Router();

// Obtener todos los usuarios según el rol del que hace la petición
router.get("/", verifyToken, async (req, res) => {
  try {
    console.log("GET /usuarios - Usuario:", req.user);
    
    let query = "";
    
    if (req.user.rol === 'superadmin') {
      // SuperAdmin puede ver todos
      query = `
        SELECT id_superadmin as id, nombre, email, 'superadmin' as rol, NULL as id_tienda FROM SuperAdmin 
        UNION 
        SELECT id_admin as id, nombre, email, 'admin' as rol, id_tienda FROM Administrador 
        UNION 
        SELECT id_empleado as id, nombre, email, 'empleado' as rol, id_tienda FROM Empleado
      `;
    } else if (req.user.rol === 'admin') {
      // Admin solo puede ver empleados de su tienda
      query = `
        SELECT id_empleado as id, nombre, email, 'empleado' as rol, id_tienda 
        FROM Empleado 
        WHERE id_tienda = ?
      `;
    }

    const [rows] = req.user.rol === 'admin' 
      ? await pool.query(query, [req.user.id_tienda])
      : await pool.query(query);

    console.log("Usuarios encontrados:", rows.length);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ message: error.message });
  }
});

// Crear administrador (solo superadmin)
router.post("/admin", verifyToken, isSuperAdmin, async (req, res) => {
  const { nombre, email, password, id_tienda } = req.body;
  
  if (!nombre || !email || !password || !id_tienda) {
    return res.status(400).json({ message: "Todos los campos son obligatorios" });
  }
  
  try {
    console.log("POST /usuarios/admin - Creando admin:", { nombre, email, id_tienda });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [result] = await pool.query(
      "INSERT INTO Administrador (nombre, email, password_hash, id_tienda) VALUES (?, ?, ?, ?)",
      [nombre.trim(), email.trim(), hashedPassword, id_tienda]
    );
    
    console.log("Admin creado con ID:", result.insertId);
    
    res.json({ 
      id: result.insertId, 
      nombre: nombre.trim(), 
      email: email.trim(), 
      rol: "admin",
      id_tienda 
    });
  } catch (error) {
    console.error("Error al crear admin:", error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: "Ya existe un usuario con ese email" });
    }
    
    res.status(500).json({ message: error.message });
  }
});

// Crear empleado (solo admin)
router.post("/empleado", verifyToken, isAdmin, async (req, res) => {
  const { nombre, email, password } = req.body;
  
  if (!nombre || !email || !password) {
    return res.status(400).json({ message: "Todos los campos son obligatorios" });
  }
  
  try {
    console.log("POST /usuarios/empleado - Creando empleado:", { nombre, email });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [result] = await pool.query(
      "INSERT INTO Empleado (nombre, email, password_hash, id_tienda) VALUES (?, ?, ?, ?)",
      [nombre.trim(), email.trim(), hashedPassword, req.user.id_tienda]
    );
    
    console.log("Empleado creado con ID:", result.insertId);
    
    res.json({ 
      id: result.insertId, 
      nombre: nombre.trim(), 
      email: email.trim(), 
      rol: "empleado",
      id_tienda: req.user.id_tienda
    });
  } catch (error) {
    console.error("Error al crear empleado:", error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: "Ya existe un usuario con ese email" });
    }
    
    res.status(500).json({ message: error.message });
  }
});

// Actualizar usuario
router.put("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { nombre, email } = req.body;
  
  if (!nombre || !email) {
    return res.status(400).json({ message: "Nombre y email son obligatorios" });
  }
  
  try {
    // Determinar en qué tabla actualizar según el rol del usuario logueado
    let table = "";
    let idField = "";
    
    if (req.user.rol === 'superadmin') {
      table = "SuperAdmin";
      idField = "id_superadmin";
    } else if (req.user.rol === 'admin') {
      table = "Administrador";
      idField = "id_admin";
    } else if (req.user.rol === 'empleado') {
      table = "Empleado";
      idField = "id_empleado";
    }
    
    await pool.query(
      `UPDATE ${table} SET nombre=?, email=? WHERE ${idField}=?`, 
      [nombre.trim(), email.trim(), id]
    );
    
    res.json({ message: "Usuario actualizado" });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).json({ message: error.message });
  }
});

// Eliminar usuario
router.delete("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Solo superadmin puede eliminar admins, solo admin puede eliminar empleados
    if (req.user.rol === 'superadmin') {
      await pool.query("DELETE FROM Administrador WHERE id_admin=?", [id]);
    } else if (req.user.rol === 'admin') {
      await pool.query("DELETE FROM Empleado WHERE id_empleado=? AND id_tienda=?", [id, req.user.id_tienda]);
    }
    
    res.json({ message: "Usuario eliminado" });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;