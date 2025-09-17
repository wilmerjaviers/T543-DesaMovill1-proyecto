const pool = require("../config/db");

exports.getTiendas = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM Tienda");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Error al obtener tiendas" });
  }
};

exports.createTienda = async (req, res) => {
  const { nombre, direccion, telefono } = req.body;
  try {
    await pool.query(
      "INSERT INTO Tienda (nombre, direccion, telefono) VALUES (?, ?, ?)", 
      [nombre, direccion, telefono]
    );
    res.json({ message: "Tienda creada" });
  } catch (err) {
    res.status(500).json({ message: "Error al crear tienda" });
  }
};
