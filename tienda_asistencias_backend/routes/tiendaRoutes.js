const express = require("express");
const router = express.Router();
const { getTiendas, createTienda } = require("../controllers/tiendaController");
const verifyToken = require("../middleware/authMiddleware");

router.get("/", verifyToken(["superadmin"]), getTiendas);
router.post("/", verifyToken(["superadmin"]), createTienda);

module.exports = router;
