require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { neon } = require("@neondatabase/serverless");
const jwt = require("jsonwebtoken"); // JWT para autenticación
const SplunkLogger = require("splunk-logging").Logger;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sql = neon(process.env.DATABASE_URL + "&sslmode=require");

// Configuración Splunk
const splunkConfig = {
  token: process.env.SPLUNK_TOKEN,
  url: process.env.SPLUNK_URL || "https://prd-p-qm22n.splunkcloud.com:8088",
};

const logger = new SplunkLogger(splunkConfig);
logger.error = (err) => {
  console.error("Error de conexión con Splunk:", err);
};

function enviarLog(evento, nivel = "info") {
  const mensaje = {
    message: JSON.stringify({
      event: evento,
      severity: nivel,
      timestamp: new Date(),
    }),
  };
  console.log("Enviando log a Splunk:", mensaje);
  logger.send(mensaje, (err, res) => {
    if (err) {
      console.error("Error enviando log a Splunk:", err);
    } else {
      console.log("Log enviado a Splunk:", res);
    }
  });
}

// Endpoint para recibir logs desde frontend Angular
app.post("/logs", (req, res) => {
  const { evento, nivel } = req.body;
  console.log("Recibido log desde Angular:", evento);

  logger.send({ message: evento, severity: nivel }, (err, splunkRes) => {
    if (err) {
      console.error("Error enviando log a Splunk:", err);
      return res.status(500).json({ error: "Error enviando a Splunk" });
    }
    console.log("Log enviado correctamente a Splunk");
    res.json({ success: true });
  });
});

// JWT
const JWT_SECRET = process.env.JWT_SECRET || "clave_secreta_default";

const generarToken = (user) => {
  return jwt.sign({ id: user.id, correo: user.correo }, JWT_SECRET, { expiresIn: "1h" });
};

const verificarToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) {
    return res.status(403).json({ error: "Acceso denegado. Token requerido." });
  }
  jwt.verify(token.split(" ")[1], JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: "Token inválido." });
    req.user = decoded;
    next();
  });
};

// --- RUTAS ---

app.get("/test", async (req, res) => {
  try {
    const result = await sql`SELECT version()`;
    res.json({ version: result[0].version });
  } catch (err) {
    console.error("Error de conexión:", err.message);
    res.status(500).json({ error: "Error al conectar con la base de datos." });
  }
});

// Registro usuario
app.post("/register", async (req, res) => {
  const { nombre, apellidoPaterno, apellidoMaterno, correo, password } = req.body;

  console.log("Intento de registro con:", correo);
  enviarLog({ accion: "registro", usuario: correo }, "info");

  try {
    const existingUser = await sql`SELECT * FROM users WHERE correo = ${correo}`;
    if (existingUser.length > 0) {
      enviarLog({ accion: "registro_fallido", motivo: "Correo duplicado", usuario: correo }, "warning");
      return res.status(400).json({ error: "El correo ya está registrado." });
    }

    const newUser = await sql`
      INSERT INTO users (nombre, apellido_paterno, apellido_materno, correo, password)
      VALUES (${nombre}, ${apellidoPaterno}, ${apellidoMaterno}, ${correo}, ${password})
      RETURNING id, nombre, apellido_paterno, apellido_materno, correo;
    `;

    console.log("Usuario registrado:", newUser[0]);
    enviarLog({ accion: "registro_exitoso", usuario: correo }, "success");

    const token = generarToken(newUser[0]);
    res.json({ success: true, user: newUser[0], token });
  } catch (err) {
    console.error("Error al registrar usuario:", err.message);
    enviarLog({ accion: "error_registro", error: err.message }, "error");
    res.status(500).json({ error: "Error al registrar usuario." });
  }
});

// Login usuario
app.post("/login", async (req, res) => {
  const { correo, password } = req.body;

  console.log("Intento de inicio de sesión con:", correo);

  try {
    const userQuery = await sql`SELECT * FROM users WHERE correo = ${correo} AND password = ${password}`;

    if (userQuery.length === 0) {
      console.log("Usuario o contraseña incorrectos.");
      return res.status(401).json({ error: "Credenciales incorrectas." });
    }

    const user = userQuery[0];
    const token = generarToken(user);
    res.json({ success: true, user, token });
  } catch (err) {
    console.error("Error en login:", err);
    res.status(500).json({ error: err.message });
  }
});

// Rutas para pacientes, análisis y reportes (con logs splunk donde aplique)

// Registrar paciente
app.post("/api/pacientes", async (req, res) => {
  console.log("POST /api/pacientes recibido", req.body);
  const { nombre, edad, genero } = req.body;
  try {
    const result = await sql`
      INSERT INTO pacientes (nombre, edad, genero)
      VALUES (${nombre}, ${edad}, ${genero})
      RETURNING *;
    `;
    enviarLog({ accion: "registro_paciente", paciente: nombre }, "info");
    res.json(result[0]);
  } catch (err) {
    console.error("Error al registrar paciente:", err.message);
    enviarLog({ accion: "error_registro_paciente", error: err.message }, "error");
    res.status(500).json({ error: "Error al registrar paciente." });
  }
});

// Obtener todos los pacientes
app.get("/api/pacientes", async (req, res) => {
  try {
    const result = await sql`SELECT * FROM pacientes ORDER BY id ASC;`;
    res.json(result);
  } catch (err) {
    console.error("Error al obtener pacientes:", err.message);
    res.status(500).json({ error: "Error al obtener pacientes." });
  }
});

// Actualizar paciente
app.put("/api/pacientes/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, edad, genero } = req.body;
  try {
    const result = await sql`
      UPDATE pacientes SET nombre = ${nombre}, edad = ${edad}, genero = ${genero}
      WHERE id = ${id}
      RETURNING *;
    `;
    if (result.length === 0) {
      return res.status(404).json({ error: "Paciente no encontrado." });
    }
    res.json(result[0]);
  } catch (err) {
    console.error("Error al actualizar paciente:", err.message);
    res.status(500).json({ error: "Error al actualizar paciente." });
  }
});

// Eliminar paciente
app.delete("/api/pacientes/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await sql`DELETE FROM pacientes WHERE id = ${id};`;
    res.sendStatus(204);
  } catch (err) {
    console.error("Error al eliminar paciente:", err.message);
    res.status(500).json({ error: "Error al eliminar paciente." });
  }
});

// Guardar análisis (ECG o imagen)
app.post("/api/analisis", async (req, res) => {
  console.log("Datos recibidos en backend:", req.body);

  try {
    const paciente_id = Number(req.body.paciente_id);
    const tipo = req.body.tipo;
    const resultado = req.body.resultado;

    if (!Number.isInteger(paciente_id)) {
      return res.status(400).json({ error: 'paciente_id debe ser un entero válido' });
    }

    const pacienteExiste = await sql`SELECT 1 FROM pacientes WHERE id = ${paciente_id}`;
    if (pacienteExiste.length === 0) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }

    const result = await sql`
    INSERT INTO analisis (paciente_id, tipo, resultado, fecha)
    VALUES (${paciente_id}, ${tipo}, ${resultado}, NOW())
    RETURNING *;
   `;

    console.log("req.body recibido:", req.body);

    enviarLog({ accion: "registro_analisis", paciente_id, tipo }, "info");
    res.json(result[0]);

  }catch (err) {
    console.error("Error al guardar análisis:", err);
    enviarLog({ accion: "error_registro_analisis", error: err.message }, "error");
    res.status(500).json({ error: "Error al guardar análisis." });
  }
});

// Obtener historial análisis por paciente
app.get("/api/analisis/:pacienteId", async (req, res) => {
  const { pacienteId } = req.params;
  try {
    const result = await sql`
      SELECT a.id, a.fecha, a.tipo, a.resultado, a.paciente_id, p.nombre AS paciente
      FROM analisis a
      JOIN pacientes p ON a.paciente_id = p.id
      WHERE a.paciente_id = ${pacienteId}
      ORDER BY a.fecha DESC;
    `;
    res.json(result);
  } catch (err) {
    console.error("Error al obtener análisis:", err.message);
    res.status(500).json({ error: "Error al obtener análisis." });
  }
});

// Guardar reporte médico
app.post("/api/reportes", async (req, res) => {
  const { paciente_id, contenido } = req.body;
  try {
    const result = await sql`
      INSERT INTO reportes (paciente_id, contenido)
      VALUES (${paciente_id}, ${contenido})
      RETURNING *;
    `;
    res.json(result[0]);
  } catch (err) {
    console.error("Error al guardar reporte:", err.message);
    res.status(500).json({ error: "Error al guardar reporte." });
  }
});

// Obtener reportes por paciente
app.get("/api/reportes/:pacienteId", async (req, res) => {
  const { pacienteId } = req.params;
  try {
    const result = await sql`
      SELECT * FROM reportes
      WHERE paciente_id = ${pacienteId}
      ORDER BY fecha DESC;
    `;
    res.json(result);
  } catch (err) {
    console.error("Error al obtener reportes:", err.message);
    res.status(500).json({ error: "Error al obtener reportes." });
  }
});

// Iniciar servidor
app.listen(3000, () => {
  console.log("Servidor backend corriendo en http://localhost:3000");
});
