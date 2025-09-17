const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Rutas
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/tiendas", require("./routes/tiendas"));
app.use("/api/usuarios", require("./routes/usuarios"));
app.use("/api/asistencias", require("./routes/asistencias"));

// Ruta de prueba
app.get("/api/test", (req, res) => {
  res.json({ 
    message: "Server funcionando correctamente", 
    timestamp: new Date().toISOString(),
    endpoints: [
      "POST /api/auth/login",
      "GET /api/tiendas",
      "POST /api/tiendas",
      "GET /api/usuarios",
      "POST /api/usuarios/admin",
      "POST /api/usuarios/empleado"
    ]
  });
});

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo 🚀 en http://localhost:${PORT}`);
  console.log(`Base de datos: ${process.env.DB_NAME}`);
  console.log(`JWT Secret configurado: ${!!process.env.JWT_SECRET}`);
});