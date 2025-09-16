const jwt = require("jsonwebtoken");

// Middleware principal de verificación de token

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ message: "Token requerido" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Token inválido" });
    }

    req.user = decoded;
    next();
  });
};

// Middleware para verificar rol de superadmin

const isSuperAdmin = (req, res, next) => {
  if (req.user.rol !== 'superadmin') {
    return res.status(403).json({ message: "Acceso denegado: Se requiere rol de superadmin" });
  }
  next();
};

// Middleware para verificar rol de admin

const isAdmin = (req, res, next) => {
  if (req.user.rol !== 'admin') {
    return res.status(403).json({ message: "Acceso denegado: Se requiere rol de admin" });
  }
  next();
};

// Middleware para verificar rol de empleado

const isEmpleado = (req, res, next) => {
  if (req.user.rol !== 'empleado') {
    return res.status(403).json({ message: "Acceso denegado: Se requiere rol de empleado" });
  }
  next();
};

module.exports = {
  verifyToken,
  isSuperAdmin,
  isAdmin,
  isEmpleado
};