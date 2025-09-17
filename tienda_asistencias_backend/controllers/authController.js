const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  const { email, password } = req.body;

  console.log("=== LOGIN DEBUG ===");
  console.log("Email recibido:", email);
  console.log("Password recibido:", password);
  console.log("Body completo:", req.body);

  try {
    
    let [rows] = await pool.query(
      "SELECT id_superadmin AS id, nombre, email, password_hash, 'superadmin' as rol, NULL as id_tienda FROM SuperAdmin WHERE email = ? " +
      "UNION SELECT id_admin AS id, nombre, email, password_hash, 'admin' as rol, id_tienda FROM Administrador WHERE email = ? " +
      "UNION SELECT id_empleado AS id, nombre, email, password_hash, 'empleado' as rol, id_tienda FROM Empleado WHERE email = ?",
      [email, email, email]
    );

    console.log("Cantidad de usuarios encontrados:", rows.length);

    if (rows.length === 0) {
      console.log("❌ Usuario no encontrado");
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const user = rows[0];
    console.log("✅ Usuario encontrado:");
    console.log("- ID:", user.id);
    console.log("- Nombre:", user.nombre);
    console.log("- Email:", user.email);
    console.log("- Rol:", user.rol);
    console.log("- Hash en DB:", user.password_hash);

    // Verificar contraseña
    console.log("🔐 Verificando contraseña...");
    const validPass = await bcrypt.compare(password, user.password_hash);
    console.log("¿Contraseña válida?:", validPass);

    if (!validPass) {
      console.log("❌ Contraseña incorrecta");
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    console.log("✅ Contraseña correcta");

    // Verificar JWT_SECRET
    console.log("JWT_SECRET disponible:", !!process.env.JWT_SECRET);
    console.log("JWT_SECRET value:", process.env.JWT_SECRET);

    // Crear token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        rol: user.rol, 
        email: user.email,
        id_tienda: user.id_tienda
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    console.log("✅ Token generado:", token.substring(0, 50) + "...");

    // Respuesta
    const response = { 
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        id_tienda: user.id_tienda
      }
    };

    console.log("✅ Enviando respuesta:", response);
    res.json(response);

  } catch (err) {
    console.error("💥 Error completo en login:", err);
    res.status(500).json({ message: "Error en login", error: err.message });
  }
};