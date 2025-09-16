const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "Copo.2012", //agregar contraseña de su base de datos chavalos.
  database: process.env.DB_NAME || "tienda_asistencias",
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;
