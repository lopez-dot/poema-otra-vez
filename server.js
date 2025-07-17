const express = require("express");
const fs = require("fs");
const session = require("express-session");
const app = express();
const PORT = process.env.PORT || 3000;

const POEMA_FILE = "poema.json";
const CLAVE_SECRETA = "miclavesecreta123";

app.use(express.static("public"));
app.use(express.json());
app.use(session({
  secret: 'mi-session-secreta-789',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 horas
}));

if (!fs.existsSync(POEMA_FILE)) {
  fs.writeFileSync(POEMA_FILE, JSON.stringify([]));
}

app.get("/api/ultimo", (req, res) => {
  const versos = JSON.parse(fs.readFileSync(POEMA_FILE));
  const ultimoVerso = versos[versos.length - 1] || "";
  const palabras = ultimoVerso.trim().split(/\s+/);
  const ultima = palabras[palabras.length - 1] || "Comienza";
  res.json({ ultima });
});

app.post("/api/agregar", (req, res) => {
  const verso = req.body.verso?.trim();
  if (!verso) return res.status(400).json({ error: "Verso vacío" });

  const versos = JSON.parse(fs.readFileSync(POEMA_FILE));
  versos.push(verso);
  fs.writeFileSync(POEMA_FILE, JSON.stringify(versos, null, 2));
  res.json({ ok: true });
});

// Endpoint para login
app.post("/api/login", (req, res) => {
  const { password } = req.body;
  console.log('Login attempt with password:', password);
  console.log('Expected password:', CLAVE_SECRETA);
  
  if (password === CLAVE_SECRETA) {
    req.session.isCreator = true;
    console.log('Login successful, session set:', req.session);
    res.json({ success: true });
  } else {
    console.log('Login failed - incorrect password');
    res.status(401).json({ error: "Contraseña incorrecta" });
  }
});

// Endpoint para logout
app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ error: 'Error al cerrar sesión' });
    }
    res.clearCookie('connect.sid'); // Clear the session cookie
    res.json({ success: true });
  });
});

// Endpoint para verificar si está logueado
app.get("/api/status", (req, res) => {
  console.log('Session check:', req.session);
  console.log('Is creator:', !!req.session.isCreator);
  res.json({ isLoggedIn: !!req.session.isCreator });
});

// Ver poema completo (solo para creador logueado)
app.get("/poema", (req, res) => {
  if (!req.session.isCreator) {
    return res.status(403).send(`
      <html>
        <body style="font-family: 'Courier New', monospace; text-align: center; padding: 2em; background-color: #f6f1e7;">
          <h2>🔒 Acceso restringido</h2>
          <p>Solo la creadora puede ver el poema completo.</p>
          <a href="/" style="color: #5c4b3b;">← Volver al inicio</a>
        </body>
      </html>
    `);
  }

  const versos = JSON.parse(fs.readFileSync(POEMA_FILE));
  res.send(`
    <html>
      <body style="font-family: 'Courier New', monospace; padding: 2em; background-color: #f6f1e7;">
        <h2>📜 Poema Completo</h2>
        <pre style="text-align: left; background: #fefcf9; padding: 1em; border: 2px solid #bba17a; border-radius: 5px;">${versos.join("\n")}</pre>
        <br>
        <a href="/" style="color: #5c4b3b;">← Volver al inicio</a>
        <span style="margin: 0 1em;">|</span>
        <a href="#" onclick="logout()" style="color: #5c4b3b;">Cerrar sesión</a>
        <script>
          function logout() {
            fetch('/api/logout', { method: 'POST' })
              .then(() => window.location.href = '/');
          }
        </script>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log("Servidor escuchando en puerto " + PORT);
});